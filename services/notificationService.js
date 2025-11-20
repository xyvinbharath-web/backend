// Placeholder for Firebase Admin (FCM) or OneSignal integration
// TODO: initialize firebase-admin using service account credentials from env or secure config

async function sendPush(arg1, arg2) {
  let to, title, body, data;
  if (typeof arg1 === 'object' && arg1 !== null) {
    ({ to, title, body, data = {} } = arg1);
  } else {
    to = arg1;
    ({ title, body, data = {} } = arg2 || {});
  }
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[notification] sendPush ->', { to, title, body, data });
  }
  // TODO: Implement FCM push via firebase-admin.messaging().send()
  return { id: 'placeholder', to, title };
}

module.exports = { sendPush };
