import fs from 'fs';
import admin from 'firebase-admin';

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    // Handle cases where the JSON might be wrapped in quotes
    const cleanedJson = jsonStr.startsWith('"') && jsonStr.endsWith('"') 
      ? jsonStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n')
      : jsonStr;
    serviceAccount = JSON.parse(cleanedJson);
  } catch (err) {
    console.error('[FIREBASE] Environment variable parse error:', err.message);
    throw new Error('FIREBASE_SERVICE_ACCOUNT contains invalid JSON. Ensure you pasted the entire { ... } block correctly into Render.');
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8');
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    throw new Error('Unable to read Firebase service account from FIREBASE_SERVICE_ACCOUNT_PATH. ' + err.message);
  }
} else {
  throw new Error('Either FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH environment variable is required.');
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://charcha-25e02-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.firestore();

export { admin, db };