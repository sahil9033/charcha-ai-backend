import fs from 'fs';
import admin from 'firebase-admin';

let serviceAccount = null;

const parseServiceAccount = (content, source) => {
  try {
    // 1. Clean the string - remove whitespace and potential backticks
    let cleaned = content.trim().replace(/^`+|`+$/g, '');
    
    // 2. Remove any accidental trailing comments like //right
    cleaned = cleaned.replace(/\/\/.*$/, '').trim();
    
    // 3. Remove potential wrapping double quotes
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    console.log(`[FIREBASE] Attempting to parse service account from ${source}...`);
    
    try {
      return JSON.parse(cleaned);
    } catch (parseErr) {
      // If standard parse fails, try to fix common copy-paste escaping issues
      console.warn(`[FIREBASE] Standard JSON parse failed (${parseErr.message}), attempting recovery...`);
      
      // Fix escaped newlines that might have been double-escaped or broken
      // This is common when pasting into some web UIs
      const recovered = cleaned
        .replace(/\\n/g, '\n') // Turn literal \n into real newlines for the parser... wait
        // Actually, JSON.parse NEEDS the \n to be escaped as \n. 
        // If it's failing with "Bad escaped character", it might have been pasted as \\n
        .replace(/\\\\n/g, '\\n');
        
      return JSON.parse(recovered);
    }
  } catch (err) {
    console.error(`[FIREBASE] Final parse error from ${source}:`, err.message);
    // Log a safe snippet for debugging
    const snippet = content.replace(/\s+/g, ' ').substring(0, 50);
    console.error(`[FIREBASE] Safe Snippet: ${snippet}...`);
    throw new Error(`Invalid Firebase JSON from ${source}. Please ensure you pasted the exact content from the .json file.`);
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