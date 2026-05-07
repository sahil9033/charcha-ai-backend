import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyAuth } from './middleware/auth.js';
import conflictRoutes from './routes/conflict.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

const frontendDist = path.join(__dirname, '../frontend/dist');
const frontendDistExists = fs.existsSync(frontendDist);

if (frontendDistExists) {
  app.use(express.static(frontendDist));
}

const allowedOrigins = [
  'http://localhost:5173',
  'https://charcha-25e02.web.app',
  'https://charcha-25e02.firebaseapp.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Health check — UptimeRobot pings this
app.get('/health', (req, res) => {
  res.json({ status: 'NEETI backend alive', timestamp: new Date() });
});

// Phase 1 test — proves OpenRouter is working
app.post('/api/test', async (req, res) => {
  const { message } = req.body;
  console.log('[TEST] Received:', message);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: 'You are NEETI, an AI conflict resolution assistant.' },
          { role: 'user', content: message }
        ],
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://charcha-ai-backend.onrender.com',
          'X-Title': 'NEETI'
        }
      }
    );
    const choice = response.data.choices?.[0];
    let aiText = choice?.message?.content || choice?.message?.reasoning;
    
    // If still null, try to extract from reasoning_details
    if (!aiText && choice?.message?.reasoning) {
      aiText = choice.message.reasoning;
    }
    
    if (!aiText) {
      console.error('[TEST] Invalid response format:', JSON.stringify(response.data).substring(0, 500));
      return res.status(500).json({ success: false, error: 'Invalid response structure', details: response.data });
    }
    console.log('[TEST] AI Response:', aiText.substring(0, 100));
    res.json({ success: true, response: aiText });
  } catch (err) {
    console.error('[TEST] Error:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// Protected test endpoint — requires Firebase auth token
app.post('/api/protected-test', verifyAuth, (req, res) => {
  console.log('[PROTECTED] User:', req.user.uid);
  res.json({ success: true, message: 'Auth working!', user: req.user });
});

app.use('/api/conflict', conflictRoutes);

if (frontendDistExists) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`NEETI backend running on port ${PORT}`));
