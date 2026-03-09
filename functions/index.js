const functions = require('firebase-functions');
const admin = require('firebase-admin');

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
    // Batch targets into groups of 10 (Firestore `in` query limit)
    const allTokens = [];
    for (let i = 0; i < targets.length; i += 10) {
      const slice = targets.slice(i, i + 10);
      const tokenDocs = await admin
        .firestore()
        .collection(TOKEN_COLLECTION)
        .where('userId', 'in', slice)
        .get();
      
      if (!tokenDocs.empty) {
        allTokens.push(...tokenDocs.docs.map((d) => d.data()?.token).filter(Boolean));
      } else {
        // fallback to uid field if present
        const tokenDocsUid = await admin
          .firestore()
          .collection(TOKEN_COLLECTION)
          .where('uid', 'in', slice)
          .get();
        allTokens.push(...tokenDocsUid.docs.map((d) => d.data()?.token).filter(Boolean));
      }
    }
    return allTokens;
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
// Uses open-graph-scraper for robust metadata extraction
// ──────────────────────────────────────────────────────

/**
 * Fetches Open Graph metadata for a URL.
 * Callable: { url: string } → { title, description, image, siteName, hostname }
 */
exports.fetchLinkPreview = functions.https.onCall(async (data) => {
  const ogs = (await import('open-graph-scraper')).default;

  // Handle both v4 (data is payload) and nested (data.data) formats
  const rawUrl = data?.url || data?.data?.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing url parameter');
  }

  // Robust URL normalization
  let normalizedUrl = rawUrl.trim();
  normalizedUrl = normalizedUrl.replace(/ /g, '');
  normalizedUrl = normalizedUrl.replace(/^(https?:\/\/)+/i, 'https://');
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  functions.logger.info('fetchLinkPreview called for:', normalizedUrl);

  try {
    const { result } = await ogs({
      url: normalizedUrl,
      timeout: 8,
      fetchOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    });

    const image = result.ogImage?.[0]?.url
      || result.twitterImage?.[0]?.url
      || null;

    const metadata = {
      title: result.ogTitle || result.twitterTitle || null,
      description: result.ogDescription || result.twitterDescription || null,
      image,
      siteName: result.ogSiteName || null,
      hostname: (() => { try { return new URL(normalizedUrl).hostname; } catch { return null; } })(),
    };

    functions.logger.info('fetchLinkPreview success:', { url: normalizedUrl, hasImage: !!image });
    return metadata;
  } catch (err) {
    functions.logger.error('fetchLinkPreview error:', err.message || err);
    throw new functions.https.HttpsError('internal', 'Failed to fetch link preview');
  }
});

// ──────────────────────────────────────────────────────
// Gemini AI Proxy — keeps API key server-side only
// ──────────────────────────────────────────────────────

/**
 * Proxies Gemini AI requests so the API key never reaches the client.
 * Callable: { prompt: string, context?: string } → { text: string }
 * Requires: GEMINI_API_KEY set in functions/.env file
 */
exports.generateContent = functions.https.onCall(async (data) => {
  const prompt = data?.prompt || data?.data?.prompt;
  const context = data?.context || data?.data?.context || '';

  if (!prompt || typeof prompt !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid prompt parameter');
  }

  // Get API key from functions/.env (Firebase automatically loads it into process.env)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    functions.logger.error('GEMINI_API_KEY not set in functions/.env');
    throw new functions.https.HttpsError('internal', 'AI service not configured');
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fullPrompt = `
      You are an expert Creative Assistant for IRIS, a high-end marketing and production agency.
      Your tone should be professional, creative, and insightful.
      
      Context: ${context}
      
      Task: ${prompt}
      
      Provide a concise and actionable response.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text() || 'No response generated.';

    return { text };
  } catch (err) {
    functions.logger.error('Gemini API error:', err.message || err);
    throw new functions.https.HttpsError('internal', 'Failed to generate content');
  }
});
