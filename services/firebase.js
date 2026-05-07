import fs from 'fs';
import admin from 'firebase-admin';

let serviceAccount = null;

const parseServiceAccount = (content, source) => {
  try {
    // 1. Clean the string - remove whitespace and potential backticks from copy-paste
    let cleaned = content.trim().replace(/^`+|`+$/g, '');
    
    // 2. Remove any accidental trailing comments like //right
    cleaned = cleaned.replace(/\/\/.*$/, '').trim();
    
    // 3. Remove potential wrapping double quotes
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    // 4. Handle double-escaped newlines common in env vars
    // We want to turn literal \n (two characters) into a real newline character
    // only if it's inside the private_key string. JSON.parse usually handles this
    // if the input is a valid JSON string.
    
    console.log(`[FIREBASE] Attempting to parse service account from ${source}...`);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`[FIREBASE] Parse error from ${source}:`, err.message);
    // Log a small snippet to help debug without exposing the full key
    console.error(`[FIREBASE] Snippet: ${content.substring(0, 20)}...`);
    throw err;
  }
};

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT, 'environment variable');
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is invalid JSON.');
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8');
    serviceAccount = parseServiceAccount(raw, 'secret file');
  } catch (err) {
    throw new Error('Unable to parse Firebase secret file. Ensure it contains ONLY the JSON block with no comments or extra text.');
  }
} else {
  throw new Error('Either FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH is required.');
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