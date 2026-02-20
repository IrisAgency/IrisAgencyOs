const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
const { URL } = require('url');

admin.initializeApp();

// Firestore collection names
const TOKEN_COLLECTION = 'notification_tokens';
const OUTBOX_COLLECTION = 'notifications_outbox';
const SENT_COLLECTION = 'notifications';
const MAX_FCM_BATCH = 500; // FCM multicast limit

/**
 * Trigger: onCreate of notifications_outbox/{docId}
 * Expected payload: { title: string, body: string, targets?: string[] }
 * targets: optional list of uid to target; if omitted sends to all tokens.
 */
exports.processOutbox = functions.firestore
  .document(`${OUTBOX_COLLECTION}/{docId}`)
  .onCreate(async (snap, context) => {
    const payload = snap.data();
    const { title, body } = payload || {};
    const targets = payload?.targetUserIds || payload?.targets || payload?.targetIds;

    if (!title || !body) {
      functions.logger.warn('Missing title/body; deleting outbox doc', { id: context.params.docId });
      await snap.ref.delete();
      return null;
    }

    try {
      const tokens = await fetchTokens(targets);
      if (!tokens.length) {
        functions.logger.info('No tokens to notify');
        await snap.ref.delete();
        return null;
      }

      const batches = chunk(tokens, MAX_FCM_BATCH);
      const batchResults = await Promise.all(
        batches.map((batchTokens) =>
          admin.messaging().sendEachForMulticast({ notification: { title, body }, tokens: batchTokens })
        )
      );

      let successCount = 0;
      let failureCount = 0;
      const cleanupPromises = [];

      batchResults.forEach((response, batchIndex) => {
        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((res, idx) => {
          const token = batches[batchIndex][idx] || '';
          const tokenSuffix = token.slice(-8);
          
          if (res.success) {
            functions.logger.info(`✓ Push sent successfully to token ...${tokenSuffix}`, {
              messageId: res.messageId
            });
          } else {
            const error = res.error;
            const code = error?.code || 'unknown';
            functions.logger.error(`✗ Push failed for token ...${tokenSuffix}`, {
              errorCode: code,
              errorMessage: error?.message || 'No error message',
            });
            
            if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
              cleanupPromises.push(deleteToken(token));
            }
          }
        });
      });

      functions.logger.info('FCM multicast sent', {
        successCount,
        failureCount,
      });

      // Create per-user notification documents for in-app display
      if (Array.isArray(targets) && targets.length) {
        const batch = admin.firestore().batch();
        const createdAt = admin.firestore.FieldValue.serverTimestamp();
        
        targets.forEach((userId) => {
          const notificationRef = admin.firestore().collection(SENT_COLLECTION).doc();
          batch.set(notificationRef, {
            userId: userId,
            type: payload.type || 'system',
            title: title,
            message: body,
            severity: payload.severity || 'info',
            category: payload.category || 'system',
            entityType: payload.entityType || null,
            entityId: payload.entityId || null,
            actionUrl: payload.actionUrl || null,
            isRead: false,
            createdAt: createdAt,
          });
        });
        
        cleanupPromises.push(batch.commit());
      }

      // remove from outbox after send attempt
      cleanupPromises.push(snap.ref.delete());

      await Promise.all(cleanupPromises);
      return null;
    } catch (err) {
      functions.logger.error('Failed to process outbox', err);
      return null;
    }
  });

async function fetchTokens(targets) {
  if (Array.isArray(targets) && targets.length) {
    const slice = targets.slice(0, 10); // Firestore `in` max 10
    const tokenDocs = await admin
      .firestore()
      .collection(TOKEN_COLLECTION)
      .where('userId', 'in', slice)
      .get();
    if (!tokenDocs.empty) {
      return tokenDocs.docs.map((d) => d.data()?.token).filter(Boolean);
    }

    // fallback to uid field if present
    const tokenDocsUid = await admin
      .firestore()
      .collection(TOKEN_COLLECTION)
      .where('uid', 'in', slice)
      .get();
    return tokenDocsUid.docs.map((d) => d.data()?.token).filter(Boolean);
  }

  const snapshot = await admin.firestore().collection(TOKEN_COLLECTION).get();
  return snapshot.docs.map((d) => d.data()?.token).filter(Boolean);
}

function deleteToken(token) {
  return admin
    .firestore()
    .collection(TOKEN_COLLECTION)
    .where('token', '==', token)
    .get()
    .then((qs) => Promise.all(qs.docs.map((doc) => doc.ref.delete())));
}

function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ──────────────────────────────────────────────────────
// Link Preview Proxy — fetches OG metadata for a URL
// ──────────────────────────────────────────────────────

/**
 * Fetches a URL's HTML and extracts Open Graph meta tags.
 * Callable: { url: string } → { title, description, image, siteName, hostname }
 */
exports.fetchLinkPreview = functions.https.onCall(async (data) => {
  const targetUrl = data?.url || data?.data?.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing url parameter');
  }

  // Normalize
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const html = await fetchHtml(normalizedUrl);
    const metadata = extractOgMetadata(html, normalizedUrl);
    return metadata;
  } catch (err) {
    functions.logger.error('fetchLinkPreview error:', err.message);
    throw new functions.https.HttpsError('internal', 'Failed to fetch link preview');
  }
});

/**
 * Fetch HTML from a URL, following up to 5 redirects.
 */
function fetchHtml(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return reject(new Error('Invalid URL: ' + targetUrl));
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IrisBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 8000,
    }, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        return resolve(fetchHtml(redirectUrl, maxRedirects - 1));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        // Only need the <head> section, stop at 100KB
        if (body.length > 100000) res.destroy();
      });
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

/**
 * Extract Open Graph metadata from HTML string.
 */
function extractOgMetadata(html, sourceUrl) {
  const getMeta = (property) => {
    // Match <meta property="og:xxx" content="yyy"> or <meta name="og:xxx" content="yyy">
    const patterns = [
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
      new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  };

  // Extract title: og:title → <title> tag
  let title = getMeta('og:title');
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    title = titleMatch?.[1]?.trim() || null;
  }

  const description = getMeta('og:description') || getMeta('description');
  let image = getMeta('og:image') || getMeta('twitter:image');

  // Make relative image URLs absolute
  if (image && image.startsWith('/')) {
    try {
      const parsed = new URL(sourceUrl);
      image = `${parsed.protocol}//${parsed.host}${image}`;
    } catch {}
  }

  const siteName = getMeta('og:site_name');

  let hostname = null;
  try {
    hostname = new URL(sourceUrl).hostname;
  } catch {}

  return { title, description, image, siteName, hostname };
}
