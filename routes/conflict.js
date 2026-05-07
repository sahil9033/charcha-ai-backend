import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAuth } from '../middleware/auth.js';
import { analyzeConflict } from '../services/openrouter.js';
import { db, admin } from '../services/firebase.js';

const router = express.Router();

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' }
});

router.post('/analyze', verifyAuth, analyzeLimiter, async (req, res) => {
  const { description, conflictType = 'general', tone = 'balanced' } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ success: false, error: 'Description is required.' });
  }

  if (description.length > 2000) {
    return res.status(400).json({ success: false, error: 'Description must be 2000 characters or fewer.' });
  }

  try {
    const analysis = await analyzeConflict(description.trim(), conflictType, tone);
    const createdAt = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection('conflicts').add({
      userId: req.user.uid,
      description: description.trim(),
      conflictType,
      tone,
      ...analysis,
      createdAt
    });

    const savedDoc = await docRef.get();
    const savedData = savedDoc.data();

    res.json({ success: true, id: docRef.id, conflict: { id: docRef.id, ...savedData } });
  } catch (err) {
    console.error('[CONFLICT] analyze error:', err);
    res.status(500).json({ success: false, error: err.message || 'Analysis failed.' });
  }
});

router.get('/history', verifyAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('conflicts')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const conflicts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, conflicts });
  } catch (err) {
    console.error('[CONFLICT] history error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch history.' });
  }
});

router.get('/:id', verifyAuth, async (req, res) => {
  try {
    const docRef = db.collection('conflicts').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Conflict not found.' });
    }

    const data = doc.data();
    if (data.userId !== req.user.uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized access.' });
    }

    res.json({ success: true, conflict: { id: doc.id, ...data } });
  } catch (err) {
    console.error('[CONFLICT] fetch by id error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch conflict.' });
  }
});

router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    const docRef = db.collection('conflicts').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Conflict not found.' });
    }

    const data = doc.data();
    if (data.userId !== req.user.uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized access.' });
    }

    await docRef.delete();
    res.json({ success: true, message: 'Conflict deleted.' });
  } catch (err) {
    console.error('[CONFLICT] delete error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete conflict.' });
  }
});

export default router;
