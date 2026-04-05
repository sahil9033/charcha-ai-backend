import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenRouter } from '@openrouter/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://chrcha-ai.web.app';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CHAT_MODEL =
  process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

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
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  FRONTEND_URL,
  FRONTEND_URL.includes('.web.app')
    ? FRONTEND_URL.replace('.web.app', '.firebaseapp.com')
    : FRONTEND_URL
]));

function isLocalDevOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/** @type {OpenRouter | null} */
let openRouterClient = null;

function getOpenRouter() {
  if (!OPENROUTER_API_KEY) return null;
  if (!openRouterClient) {
    openRouterClient = new OpenRouter({
      apiKey: OPENROUTER_API_KEY,
      httpReferer: FRONTEND_URL,
      appTitle: 'Charcha AI'
    });
  }
  return openRouterClient;
}

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
    name: memory?.name || 'Friend',
    lastProblem: memory?.lastProblem || 'not shared yet',
    emotion
  };

  return template
    .replaceAll('{name}', values.name)
    .replaceAll('{lastProblem}', values.lastProblem)
    .replaceAll('{emotion}', values.emotion);
}

function extractAssistantText(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function fallbackResponse() {
  return {
    reply: 'Kuch gadbad ho gayi — ek baar phir try karo 🙏',
    emotion: 'neutral',
    showHelpline: false
  };
}

app.use('/api/chat', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

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
    provider: 'openrouter',
    model: CHAT_MODEL,
    frontendUrl: FRONTEND_URL
  });
});

app.get('/debug-openrouter', async (req, res) => {
  const client = getOpenRouter();
  if (!client) {
    return res.json({ error: 'OPENROUTER_API_KEY is not set' });
  }

  try {
    const systemPrompt = buildSystemPrompt(
      'friend',
      { name: 'Test', lastProblem: 'exam stress' },
      'neutral'
    );

    const result = await client.chat.send({
      httpReferer: FRONTEND_URL,
      appTitle: 'Charcha AI',
      chatRequest: {
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Say hello in one short sentence.' }
        ],
        stream: false,
        temperature: 0.7,
        maxTokens: 120
      }
    });

    const reply = extractAssistantText(result);

    res.json({
      model: CHAT_MODEL,
      status: reply ? 'SUCCESS' : 'EMPTY',
      reply: reply || null
    });
  } catch (error) {
    res.json({
      model: CHAT_MODEL,
      status: 'FAILED',
      error: error.message,
      details: error.cause || error.response?.data || null
    });
  }
});

function withHelpline(reply, showHelpline) {
  if (!showHelpline || reply.includes('iCall')) {
    return reply;
  }

  return `${reply}\n\nPlease call iCall: 9152987821`;
}

async function generateChatReply(systemPrompt, userMessage) {
  const client = getOpenRouter();
  if (!client) {
    throw new Error('OpenRouter client not configured');
  }

  const result = await client.chat.send({
    httpReferer: FRONTEND_URL,
    appTitle: 'Charcha AI',
    chatRequest: {
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false,
      temperature: 0.85,
      maxTokens: 200
    }
  });

  const reply = extractAssistantText(result);
  if (!reply) {
    throw new Error('Model returned an empty response');
  }

  return reply;
}

app.get('/', (req, res) => {
  res.send(
    '<h1>Charcha AI Backend is Live!</h1><p>LLM: OpenRouter (<code>' +
      CHAT_MODEL +
      '</code>)</p><p>Endpoint: <code>POST /api/chat</code></p>'
  );
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
    const reply = withHelpline((await generateChatReply(systemPrompt, message)).trim(), showHelpline);

    return res.json({
      reply,
      emotion: detectedEmotion,
      showHelpline
    });
  } catch (error) {
    console.error('OpenRouter request failed:', error.message, error.cause || '');
    return res.json(fallbackResponse());
  }
});

app.listen(PORT, () => {
  console.log(`Charcha AI backend running on port ${PORT}`);
  console.log(`OpenRouter model: ${CHAT_MODEL}`);
  if (!OPENROUTER_API_KEY) {
    console.warn(
      '[charcha] OPENROUTER_API_KEY is not set — /api/chat will return the fallback message until you add it (backend/.env or Render → Environment).'
    );
  }
});
