import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://chrcha-ai.web.app';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PRIMARY_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const BACKUP_MODEL = 'mistralai/mistral-small-3.1-24b-instruct:free';
const dailyCount = {};

const crisisKeywords = [
  'suicide',
  'kill myself',
  'end it',
  "don't want to live",
  'khatam karna',
  'jeena nahi',
  'mar jaana'
];

const emotionKeywords = {
  crisis: crisisKeywords,
  sad: ['sad', 'alone', 'useless', 'empty', 'hopeless', 'crying', 'udaas', 'akela'],
  anxious: ['anxious', 'scared', 'panic', 'worried', 'darr', 'ghabrahat'],
  angry: ['angry', 'frustrated', 'hate', 'unfair', 'gussa']
};

const allowedOrigins = Array.from(new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  FRONTEND_URL,
  FRONTEND_URL.includes('.web.app')
    ? FRONTEND_URL.replace('.web.app', '.firebaseapp.com')
    : FRONTEND_URL
]));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

function detectEmotion(text = '') {
  const lower = text.toLowerCase();

  for (const [emotion, words] of Object.entries(emotionKeywords)) {
    if (words.some((word) => lower.includes(word))) {
      return emotion;
    }
  }

  return 'neutral';
}

function normalizeEmotion(emotion) {
  const normalized = {
    sad: 'sad',
    sadness: 'sad',
    anxious: 'anxious',
    anxiety: 'anxious',
    angry: 'angry',
    anger: 'angry',
    crisis: 'crisis',
    neutral: 'neutral'
  };

  return normalized[(emotion || '').toLowerCase()] || null;
}

function buildSystemPrompt(mode, memory, emotion) {
  const prompts = {
    friend: `You are Charcha, a close and caring friend of {name}.
Speak casually, warmly, like a real person.
User's recent context: {lastProblem}
User is feeling: {emotion}
Rules: Under 80 words. Never clinical. Validate before advising.
If emotion is crisis: show "Please call iCall: 9152987821"`,

    therapist: `You are Charcha, a calm non-judgemental therapist companion.
User's name: {name}. Recent context: {lastProblem}. Emotion: {emotion}
Rules: Under 80 words. Ask one reflective question per reply.
Never diagnose. Mirror emotions: "It sounds like you're feeling..."
If crisis: show "Please call iCall: 9152987821"`,

    parent: `You are Charcha, a warm unconditionally loving parent figure.
User's name: {name}. Recent context: {lastProblem}. Emotion: {emotion}
Rules: Under 80 words. Lead with love not advice.
Use "Beta," naturally. Never shame or compare.
If crisis: show "Please call iCall: 9152987821"`
  };

  const template = prompts[mode] || prompts.friend;
  const values = {
    name: memory?.name || 'Sahil',
    lastProblem: memory?.lastProblem || 'not shared yet',
    emotion
  };

  return template
    .replaceAll('{name}', values.name)
    .replaceAll('{lastProblem}', values.lastProblem)
    .replaceAll('{emotion}', values.emotion);
}

async function requestOpenRouter(model, systemPrompt, userMessage) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model,
      max_tokens: 200,
      temperature: 0.85,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': FRONTEND_URL,
        'X-Title': 'Charcha AI'
      },
      timeout: 20000
    }
  );

  return response.data;
}

function fallbackResponse() {
  return {
    reply: 'Kuch gadbad ho gayi — ek baar phir try karo 🙏',
    emotion: 'neutral',
    showHelpline: false
  };
}

app.use('/api/chat', (req, res, next) => {
  const userId = req.body?.userId || req.ip;
  const today = new Date().toDateString();
  const key = `${userId}_${today}`;

  dailyCount[key] = (dailyCount[key] || 0) + 1;

  if (dailyCount[key] > 20) {
    return res.json({
      reply: 'Aaj ki charcha ho gayi ✦ Kal phir milenge 🌙',
      emotion: 'neutral',
      showHelpline: false,
      limitReached: true
    });
  }

  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/test', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!OPENROUTER_API_KEY,
    frontendUrl: FRONTEND_URL,
    primaryModel: PRIMARY_MODEL,
    backupModel: BACKUP_MODEL
  });
});

app.get('/debug-openrouter', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.json({ error: 'No API key configured' });
  }

  const prompt = buildSystemPrompt(
    'friend',
    { name: 'Sahil', lastProblem: 'exam stress' },
    'neutral'
  );

  const results = [];

  for (const model of [PRIMARY_MODEL, BACKUP_MODEL]) {
    try {
      const data = await requestOpenRouter(model, prompt, 'Hello');
      results.push({
        model,
        status: 'SUCCESS',
        reply: data.choices?.[0]?.message?.content || null
      });
    } catch (error) {
      results.push({
        model,
        status: 'FAILED',
        error: error.message,
        data: error.response?.data || null
      });
    }
  }

  res.json({
    config: {
      apiKeySet: !!OPENROUTER_API_KEY,
      frontendUrl: FRONTEND_URL
    },
    results
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Charcha AI Backend is Live!</h1><p>Endpoint: <code>POST /api/chat</code></p>');
});

app.post('/api/chat', async (req, res) => {
  const { message, mode = 'friend', memory = {}, emotion } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      reply: 'Please send a message first.',
      emotion: 'neutral',
      showHelpline: false
    });
  }

  const detectedEmotion = normalizeEmotion(emotion) || detectEmotion(message);
  const safeMode = ['friend', 'therapist', 'parent'].includes(mode) ? mode : 'friend';
  const systemPrompt = buildSystemPrompt(safeMode, memory, detectedEmotion);
  const showHelpline = crisisKeywords.some((word) => message.toLowerCase().includes(word));

  if (!OPENROUTER_API_KEY) {
    return res.json(fallbackResponse());
  }

  try {
    const data = await requestOpenRouter(PRIMARY_MODEL, systemPrompt, message);
    let reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error('Primary model returned an empty response');
    }

    reply = reply.trim();

    if (showHelpline && !reply.includes('iCall')) {
      reply = `${reply}\n\nPlease call iCall: 9152987821`;
    }

    return res.json({
      reply,
      emotion: detectedEmotion,
      showHelpline
    });
  } catch (primaryError) {
    console.error('Primary OpenRouter request failed:', primaryError.response?.data || primaryError.message);

    try {
      const data = await requestOpenRouter(BACKUP_MODEL, systemPrompt, message);
      let reply = data.choices?.[0]?.message?.content;

      if (!reply) {
        throw new Error('Backup model returned an empty response');
      }

      reply = reply.trim();

      if (showHelpline && !reply.includes('iCall')) {
        reply = `${reply}\n\nPlease call iCall: 9152987821`;
      }

      return res.json({
        reply,
        emotion: detectedEmotion,
        showHelpline
      });
    } catch (backupError) {
      console.error('Backup OpenRouter request failed:', backupError.response?.data || backupError.message);
      return res.json(fallbackResponse());
    }
  }
});

app.listen(PORT, () => {
  console.log(`Charcha AI backend running on port ${PORT}`);
});
