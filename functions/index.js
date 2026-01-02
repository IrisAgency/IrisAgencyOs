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
            functions.logger.info('✓ Push sent successfully', {
              tokenSuffix,
              messageId: res.messageId
            });
          } else {
            const error = res.error;
            const code = error?.code || '';
            functions.logger.error('✗ Push failed', {
              tokenSuffix,
              errorCode: code,
              errorMessage: error?.message || null,
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

      // mirror to notifications collection for history/UI
      cleanupPromises.push(admin.firestore().collection(SENT_COLLECTION).add({
        title,
        body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        targets: targets || null,
      }));

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
