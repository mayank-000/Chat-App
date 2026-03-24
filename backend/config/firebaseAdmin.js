import admin from 'firebase-admin';

const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf-8')
);

admin.initializeApp({
    credentials: admin.credential.cert(serviceAccount)
});

export default admin;
  