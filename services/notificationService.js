// Placeholder for Firebase Admin (FCM) or OneSignal integration
// TODO: initialize firebase-admin using service account credentials from env or secure config

async function sendPush({ to, title, body, data = {} }) {
  // TODO: Implement FCM push via firebase-admin.messaging().send()
  // For now, simulate
  return { id: 'placeholder', to, title };
}

module.exports = { sendPush };
