import fs from 'fs';
import admin from 'firebase-admin';

let serviceAccount = null;

const parseServiceAccount = (content, source) => {
  try {
    // 1. Clean the string
    let cleaned = content.trim();
    
    // 2. Remove any accidental trailing comments like //right
    cleaned = cleaned.replace(/\/\/.*$/, '');
    
    // 3. Remove potential wrapping quotes
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    // 4. Fix common escape character issues (\n vs \\n)
    // If the string contains literal newlines, it's definitely invalid JSON, 
    // but we can try to fix the most common one in private keys.
    cleaned = cleaned.replace(/\\n/g, '\n'); 
    // Wait, JSON.parse needs literal \n to be represented as the string "\n"
    // So actually we should ensure they are escaped for the parser.
    // Let's stick to standard JSON.parse first but with extreme cleaning.
    
    return JSON.parse(content.trim());
  } catch (err) {
    console.error(`[FIREBASE] Parse error from ${source}:`, err.message);
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