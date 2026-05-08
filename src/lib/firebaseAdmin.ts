import fs from "fs";
import admin from "firebase-admin";
import serviceAccount from "../credentials/crmlearning-55a6a-firebase-adminsdk-fbsvc-d8fe922e6e.json" assert { type: "json" };
function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  try {
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    if (serviceAccountPath) {
      const raw = fs.readFileSync(serviceAccountPath, "utf8");
      const serviceAccount = JSON.parse(raw);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    // Fallback to application default credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
    throw err;
  }
}

const app = initFirebaseAdmin();
export const fcm = admin.messaging(app);

export default app;
