import { admin } from '../services/firebase.js';

// Middleware to verify Firebase ID token
export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
    next();
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message);
    res.status(401).json({ success: false, error: 'Invalid or expired token', details: err.message });
  }
};
