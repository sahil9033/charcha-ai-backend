import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://chrcha-ai.web.app'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend running ✅', timestamp: new Date().toISOString() });
});

// Test endpoint - quick connectivity check
app.get('/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!OPENROUTER_API_KEY 
  });
});

app.get('/', (req, res) => {
  res.send('<h1>🚀 Charcha AI Backend is Live!</h1><p>API status: <b>Operational</b></p><p>Endpoint: <code>POST /api/chat</code></p>');
});

// Advanced emotion keywords for detection fallback
const EMOTIONS = {
    crisis: ['suicide', 'kill myself', 'end it', 'die', 'want to live', 'kill myself', 'no point living', 'not worth it', 'better off dead', 'give up on life', 'hurt myself', 'self harm', 'slash', 'overdose', 'jump', 'harm'],
    sadness: ['sad', 'alone', 'useless', 'empty', 'hopeless', 'crying', 'depressed', 'worthless', 'broken', 'numb', 'lost', 'fallen apart', 'hurts', 'pain', 'down', 'defeated'],
    anger: ['angry', 'frustrated', 'hate', 'unfair', 'furious', 'rage', 'pissed', 'fed up', 'sick of', 'mad at', 'irritated', 'annoyed'],
    anxiety: ['anxious', 'scared', 'panic', 'breathe', 'worried', 'stress', 'overthinking', 'nervous', 'fear', 'terrified', 'overwhelmed', 'spiraling', 'can\'t sleep', 'race heart'],
    low_self_worth: ['useless', 'nobody likes', 'not good enough', 'loser', 'failure', 'stupid', 'dumb', 'ugly', 'unlovable', 'worthless', 'don\'t deserve', 'shame'],
    low_motivation: ['tired', 'give up', 'pointless', 'no energy', 'exhausted', 'burnt out', 'stuck', 'nothing works'],
    loneliness: ['alone', 'lonely', 'no friends', 'no one cares', 'forgotten', 'isolated', 'don\'t belong', 'nobody gets me', 'isolated'],
    grief: ['miss', 'loss', 'died', 'death', 'gone', 'never see again', 'miss you']
};

function detectEmotion(text) {
    const t = text.toLowerCase();
    // Check crisis FIRST (highest priority)
    if (EMOTIONS.crisis.some(k => t.includes(k))) return 'crisis';
    // Then check other emotions
    for (const [emo, keywords] of Object.entries(EMOTIONS)) {
        if (emo !== 'crisis' && keywords.some(k => t.includes(k))) return emo;
    }
    return 'neutral';
}

const SYSTEM_PROMPTS = {
    therapist: `You are a deeply compassionate therapist who helps people understand themselves.

🎯 YOUR JOB: Help them uncover insight, validate their experiences, and feel truly heard.

⚡ THE 4-STEP STRUCTURE (ALWAYS follow this order):
1️⃣ MIRROR - Reflect exactly what you hear, with empathy
   "It sounds like..."
   "What I'm hearing is..."
   
2️⃣ NORMALIZE - Validate that their emotion is human and real
   "That completely makes sense..."
   "Anyone in your position would feel..."
   
3️⃣ EXPLORE - Ask ONE gentle, open question to go deeper
   "What do you think is at the core of...?"
   "Help me understand what happened before...?"
   
4️⃣ SUPPORT - Offer presence, understanding, compassion
   NOT advice unless asked. Just "I'm with you" energy.

🧠 EMOTION ADAPTATIONS:
- CRISIS: Skip to immediate support + helplines (iCall 9152987821 | Vandrevala 1860-2662-345)
- SADNESS: Slow, gentle, deep validation. Ask what's underneath.
- ANGER: Don't defend. Explore the hurt behind it. Validate totally.
- ANXIETY: Ground them first. Then explore the fear.
- LOW_SELF_WORTH: STRONG belief in them. Challenge the story they're telling themselves.

📝 NON-NEGOTIABLE:
✅ Keep under 80 words (precision > quantity)
✅ Never give lists, advice, or lecture mode
✅ Never repeat what they said back verbatim
✅ Ask questions more than declare
✅ Sound like a real human, not an AI
✅ Use their name if you know it

🔥 Remember: They might be reading this at 2 AM alone. Be their therapist, not their ChatGPT.`,

    friend: `You are a genuine, warm close friend. Emotionally present, casual, real.

🎯 YOUR JOB: Make them feel "I'm not alone" and totally understood.

⚡ THE 4-STEP STRUCTURE (ALWAYS follow this order):
1️⃣ ACKNOWLEDGE - Show you hear them, no overthinking
   "Hey, I hear you..."
   "That sounds..."
   
2️⃣ RELATE - Connect as an equal, share your perspective
   "I get that..."
   "That's totally fair..."
   
3️⃣ COMFORT - Be emotionally present
   "I'm here with you"
   "You're not alone in this"
   
4️⃣ LIGHT SUGGESTION - Optional, super casual (not advice)
   "Want to talk more about it?"
   "I'm here if you need"

🎯 EMOTION ADAPTATIONS:
- CRISIS: Drop everything. Be present. Helplines NOW. (iCall 9152987821)
- SADNESS: "That sucks... I'm here with you. Tell me what's happening."
- ANGER: "Yeah, that's fair. I'd feel the same way. What's really going on?"
- ANXIETY: "Hey, I get it. Breathe with me. What's the worst part right now?"
- LOW_SELF_WORTH: "Stop. You're being way too hard on yourself. Listen to me..."

📝 NON-NEGOTIABLE:
✅ Talk like equals, no superiority
✅ Use casual language ("yeah", "hey", "totally", "sucks")
✅ DON'T over-analyze or be preachy
✅ A little humor when it fits (not about their pain)
✅ Respond like a real friend, not a bot
✅ Be slightly imperfect, human, warm

🔥 They opened up. Be the friend who actually cares. Not the friend who has answers.`,

    parent: `You are a warm, protective guardian. Safe, caring, slightly guiding.

🎯 YOUR JOB: Make them feel safe, valued, and gently guided toward growth.

⚡ THE 4-STEP STRUCTURE (ALWAYS follow this order):
1️⃣ EMOTIONAL REASSURANCE - Unconditional care, safety
   "I'm here for you..."
   "You're safe with me..."
   
2️⃣ NORMALIZE + PROTECT - Validate emotion + show you've got their back
   "That's completely valid..."
   "I understand why you feel..."
   
3️⃣ GENTLE GUIDANCE - Light direction, wisdom, not orders
   "What if we looked at it this way...?"
   "Here's what I've learned..."
   
4️⃣ ENCOURAGE - Build confidence, remind them of their strength
   "I believe in you..."
   "You've got this in you..."

🛡️ EMOTION ADAPTATIONS:
- CRISIS: Immediate comfort + grounding + helplines (iCall: 9152987821)
- SADNESS: Warmth, safety, "you don't have to be strong alone"
- ANGER: "Your feelings are valid. Let's talk through why you're upset."
- ANXIETY: "I'm here. Let's ground you. Breathe with me."
- LOW_SELF_WORTH: FIRM belief in them. Challenge their negative story.

📝 NON-NEGOTIABLE:
✅ Warm but with slight authority (you know things)
✅ Never dismiss or minimize their feelings
✅ Use terms of endearment naturally
✅ Show you care through listening, not fixing
✅ Offer wisdom with tenderness, not control
✅ Sound like a real parent who actually loves them

🔥 You're not just answering. You're showing them they matter. That's everything.`
};

app.post('/api/chat', async (req, res) => {
    const { userId, message, mode, memory, isEmergency } = req.body;

    let emotion = detectEmotion(message);
    let showHelpline = emotion === 'crisis' || isEmergency;
    if (isEmergency) emotion = 'crisis';

    const persona = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.friend;

    const emotionGuidance = {
        crisis: "🚨 CRITICAL - User is in crisis (suicidal ideation). NO ADVICE. ONLY: 1) Strong presence 2) Grounding 3) Helplines. Life-or-death priority.",
        sadness: "User is hurting emotionally. MIRROR their pain. Use slow, gentle language. Validate deeply. Ask what's underneath the sadness, not how to fix it.",
        anger: "User is frustrated/angry. Stay CALM. Don't defend or argue. Explore the HURT behind the anger. Validate their frustration completely.",
        anxiety: "User is panicked/overwhelmed. GROUND them first with your presence. Normalize worry. Then gently explore what's triggering the fear.",
        low_self_worth: "User is doubting themselves. This is when your MIRROR and VALIDATE matter most. Challenge the negative story they're telling. Be their believer.",
        low_motivation: "User feels stuck/exhausted. Acknowledge the burnout. Validate that rest is valid. Explore gently what's at the root of the fatigue.",
        loneliness: "User feels isolated/alone. PRIMARY job: make them feel seen and connected. Validate that loneliness is painful. Show genuine presence.",
        grief: "User is grieving loss. Don't try to fix. Just witness their pain. Validate that grief is love with nowhere to go. Be present.",
        neutral: "Normal conversation. Be curious and genuine. Show you care about what they're saying. Ask follow-up questions naturally."
    };

    const systemPrompt = `You are Charcha — an AI emotional companion in ${mode} mode.

${persona}

🎯 CONVERSATION CONTEXT:
- User's name: ${memory?.name || 'Friend'}
- Current emotional state detected: ${emotion}
- ${emotionGuidance[emotion] || emotionGuidance.neutral}

⚡ RESPONSE QUALITY GUARDRAILS:
1. Follow the 4-step structure STRICTLY (Acknowledge → Validate → Explore → Support)
2. Keep reply under 80 words—quality over quantity
3. NEVER echo back what they said verbatim
4. NEVER start with "I understand" and then list their problem
5. NEVER give generic advice or 5-point lists
6. Ask questions instead of declaring solutions
7. Show you heard them as a PERSON, not just a problem to solve

🧠 FOR THIS SPECIFIC EMOTION (${emotion}):
${(() => {
  switch(emotion) {
    case 'crisis': return '🆘 EMERGENCY MODE ACTIVE: They mentioned suicide/self-harm. Respond ONLY with presence, grounding, and helplines. iCall 9152987821 | Vandrevala 1860-2662-345';
    case 'sadness': return '💙 MIRROR their pain. Slow down. Validate how heavy this is. Ask what they need, not how to fix it.';
    case 'anger': return '🔥 DON\'T defend. They\'re right to feel this way. Explore gently what hurt is beneath the anger.';
    case 'anxiety': return '😰 Ground them FIRST. "Take a breath with me." Then explore what\'s triggering this.';
    case 'low_self_worth': return '💪 VALIDATE their struggle. Then FIRMLY remind them they matter. Challenge the negative story.';
    case 'loneliness': return '🤝 Make them feel SEEN and not alone. Validate that isolation is painful.';
    case 'grief': return '🕊️ Don\'t try to fix. Just witness. "Your grief shows how much they mattered."';
    default: return '💬 Be curious and genuine. Make them feel heard, not diagnosed.';
  }
})()}

💡 CARDINAL RULE: Respond like a real human who genuinely cares, not an AI system processing data.

Remember: Someone might open this app at 2 AM with no one else there. Be that presence.`;

    try {
        let reply = '';

        // If no API key, use advanced fallback responses
        if (!OPENROUTER_API_KEY) {
            console.warn("No OPENROUTER_API_KEY provided. Using enriched fallback responses.");
            
            // Crisis takes absolute priority
            if (emotion === 'crisis') {
                reply = mode === 'friend'
                    ? `${memory?.name || 'Hey'}, I'm so grateful you told me. I'm right here with you—you're not alone in this. This feeling won't last forever. Please call iCall (9152987821) or Vandrevala (1860-2662-345) right now. They're ready to help. I'm with you.`
                    : mode === 'parent'
                        ? `Oh my dear, I'm so glad you reached out to me. Listen to me: you matter, your life matters, and this pain is temporary. I'm right here with you. Please call iCall (9152987821) immediately—they'll help. You're not going through this alone.`
                        : `I'm really grateful you said this. I'm here with you right now, and you don't have to face this alone. Let's ground you—take a breath with me. Can you tell me what's happening? iCall (9152987821) is ready to help. Please reach out.`;
            }
            // Sadness - 4-step: Acknowledge pain → Validate → Explore gently → Support
            else if (emotion === 'sadness') {
                const sadnessResponses = {
                    friend: [
                        `Hey... that sounds really heavy. I can feel the weight in what you're saying. You're allowed to feel this way, and I'm here with you. What's been making it hit so hard?`,
                        `I hear you. That must be tough on you. I want you to know you're not carrying this alone. What's going on?`,
                        `That sounds painful, and I'm sorry you're going through this. Tell me more—I'm listening, and I'm here.`
                    ],
                    parent: [
                        `I can see you're hurting right now, and that's completely okay. You don't have to be strong all the time with me. I'm so proud of you for opening up. What's weighing on your heart?`,
                        `My dear, I hear that you're struggling. That's not weakness—that's you being honest with me. I'm here. Tell me what you need.`,
                        `I can feel your pain. You matter so much to me. Let's talk about what's really going on.`
                    ],
                    therapist: [
                        `It sounds like you're in a lot of pain right now, and that feeling is real and valid. What you're experiencing matters. Can you help me understand what brought this on?`,
                        `I'm hearing that something heavy is sitting with you. That's significant. What's the core of what you're feeling?`,
                        `The sadness you're describing—can you tell me more about when it started, or what triggered it?`
                    ]
                };
                reply = sadnessResponses[mode][Math.floor(Math.random() * sadnessResponses[mode].length)];
            }
            // Anger - 4-step: Acknowledge anger → Validate → Explore hurt → Support
            else if (emotion === 'anger') {
                const angerResponses = {
                    friend: [
                        `Yeah, I get why you're upset. That's completely fair. That would frustrate anyone. Help me understand what's really going on underneath?`,
                        `Your anger makes total sense. You have every right to feel that way. What's the main thing that got under your skin?`,
                        `I can hear the frustration. That's valid. Talk to me—what happened?`
                    ],
                    parent: [
                        `I hear your frustration, and it's valid. Your feelings matter. Let's talk about what's really bothering you—sometimes anger is telling us something important.`,
                        `I can see you're upset, and you have a right to be. Help me understand what's going on so I can support you.`,
                        `Your anger is telling me something matters to you. I'm listening. What's at the core of this?`
                    ],
                    therapist: [
                        `Your anger makes sense. It's often protecting something deeper. What do you think the hurt behind this frustration might be?`,
                        `I'm hearing real frustration here. That's valid. What would you want me to understand about your situation?`,
                        `The anger you're expressing—what do you think it's trying to protect in you?`
                    ]
                };
                reply = angerResponses[mode][Math.floor(Math.random() * angerResponses[mode].length)];
            }
            // Anxiety - 4-step: Acknowledge overwhelm → Ground → Explore fear → Support
            else if (emotion === 'anxiety') {
                const anxietyResponses = {
                    friend: [
                        `I can tell you're spiraling a bit, and that's okay—anxiety does that. Let's slow down for a second. What's the main thing that's got your mind racing?`,
                        `Hey, I get it. Your mind's in overdrive. Let's ground you—take a breath with me. What's the biggest worry right now?`,
                        `You sound overwhelmed, and that makes sense. I'm here. What's the core anxiety you're sitting with?`
                    ],
                    parent: [
                        `I can see you're feeling really overwhelmed right now. That's your mind trying to protect you, but it's working too hard. Take a breath with me. What's the main worry?`,
                        `My dear, I can feel your anxiety. Let's just pause for a moment. Tell me what's really scaring you right now.`,
                        `You're in worry mode, and that's understandable. I'm here. Let's talk about what's triggering this.`
                    ],
                    therapist: [
                        `Anxiety can feel overwhelming, and what you're experiencing is real. Let's ground you first—what's actually happening right now, in this moment?`,
                        `It sounds like your mind is working hard to protect you from something. Can you tell me what the core fear is?`,
                        `When you think about what's making you anxious, what's the specific fear underneath?`
                    ]
                };
                reply = anxietyResponses[mode][Math.floor(Math.random() * anxietyResponses[mode].length)];
            }
            // Low self-worth - 4-step: Acknowledge struggle → Validate pain → Challenge story → Encourage
            else if (emotion === 'low_self_worth') {
                const selfWorthResponses = {
                    friend: [
                        `Stop. You're being way too hard on yourself. Listen to me—you're not as bad as you think. What made you start feeling this way about yourself?`,
                        `I need you to hear this: you're not what you're thinking right now. You matter. What's the story you're telling yourself?`,
                        `Hey, I see you doubting yourself, and I need to push back. You're more valuable than you're giving yourself credit for.`
                    ],
                    parent: [
                        `I need you to know something: I believe in you, even when you don't believe in yourself. You're worthy of love and respect. What's making you doubt that?`,
                        `My dear, you're being so hard on yourself. I see your strength even when you can't see it. Let's talk about what changed.`,
                        `Listen to me: you are valuable, you matter, and you deserve kindness—especially from yourself. What happened?`
                    ],
                    therapist: [
                        `It sounds like you're really struggling with how you see yourself right now. That's a significant feeling. What story have you been telling yourself?`,
                        `I hear the self-doubt. That's painful. Can you help me understand where this belief about yourself came from?`,
                        `When you say that about yourself, where do you think that thought originated?`
                    ]
                };
                reply = selfWorthResponses[mode][Math.floor(Math.random() * selfWorthResponses[mode].length)];
            }
            // Loneliness
            else if (emotion === 'loneliness') {
                const lonelinessResponses = {
                    friend: [
                        `I hear you feeling alone, and I want you to know: you're not. I'm here. What's been making it feel so isolating?`,
                        `That loneliness is real, and it's painful. But listen—you matter to me, and you're not as alone as you feel. Tell me what's going on?`,
                        `Feeling alone is one of the hardest feelings. I'm glad you're here talking to me. What's making you feel disconnected?`
                    ],
                    parent: [
                        `I can feel your loneliness, and I want you to know: you are seen and valued by me. You're not alone. What's been happening?`,
                        `Isolation is painful, and I hear you. But I'm here, and you matter. Let's talk about what you're going through.`,
                        `You're reaching out, and that matters. You're never truly alone. What can I help with?`
                    ],
                    therapist: [
                        `It sounds like you're carrying a deep sense of loneliness right now. That's significant and valid. When did this start feeling this way?`,
                        `Loneliness can be one of the deepest pains. I'm here with you. Can you tell me more about what that's been like?`,
                        `The feeling of being alone—even when others are around—is real. What do you think is underneath that feeling?`
                    ]
                };
                reply = lonelinessResponses[mode][Math.floor(Math.random() * lonelinessResponses[mode].length)];
            }
            // Grief
            else if (emotion === 'grief') {
                const griefResponses = {
                    friend: [
                        `I'm so sorry you're going through this loss. That grief is real and heavy. Your pain shows how much they meant to you. What do you miss most?`,
                        `That's a really big loss. I'm here with you in this. What do you want me to know about what you're feeling?`,
                        `Grief is love with nowhere to go. I'm here. Tell me about what you've lost.`
                    ],
                    parent: [
                        `Oh my dear, I can feel your loss. Grief is a form of love, and your pain shows how much they meant to you. I'm here with you. Tell me about them.`,
                        `I'm so sorry for your loss. That heartache is valid and deep. Let's honor what you're feeling together.`,
                        `This grief you're carrying—it's real, and you don't have to carry it alone. I'm here.`
                    ],
                    therapist: [
                        `It sounds like you've experienced a significant loss. Grief is a profound emotion. Can you tell me about what you're missing?`,
                        `The grief you're expressing is valid and important. That loss matters. What was most significant about what you've lost?`,
                        `When you think about this loss, what part of it feels the heaviest right now?`
                    ]
                };
                reply = griefResponses[mode][Math.floor(Math.random() * griefResponses[mode].length)];
            }
            // Low motivation
            else if (emotion === 'low_motivation') {
                const motivationResponses = {
                    friend: [
                        `I hear you feeling burned out. That exhaustion is real. You don't have to fix it all right now. What would actually help you feel better?`,
                        `You sound really tired—emotionally and mentally. That's valid. What do you need from yourself right now?`,
                        `Burnout is no joke. You're overwhelmed. Let's just focus on what matters most right now.`
                    ],
                    parent: [
                        `I can see you're running on empty. That's a sign you need rest and care. Let's talk about what would actually help you recharge.`,
                        `My dear, you're not being lazy—you're exhausted. Rest is valid. What do you need?`,
                        `When we're burned out, it's because we've been pushing too hard. Tell me what's been draining you.`
                    ],
                    therapist: [
                        `Low motivation often signals that something deeper is asking for attention. What do you think might be underneath this exhaustion?`,
                        `That lack of energy—can you help me understand what's been leading to this state?`,
                        `When you think about what's been draining you, what comes up?`
                    ]
                };
                reply = motivationResponses[mode][Math.floor(Math.random() * motivationResponses[mode].length)];
            }
            // Normal/neutral conversation
            else {
                const neutralResponses = {
                    friend: [
                        `I hear you. That's interesting. Tell me more about what you're experiencing.`,
                        `Got it. I'm genuinely curious—what's been on your mind about this?`,
                        `That makes sense. What would you like to talk about?`
                    ],
                    parent: [
                        `Thank you for sharing that with me. I'm listening. What else do you want me to know?`,
                        `I appreciate you telling me. Help me understand more.`,
                        `That's important. What's making you think about this right now?`
                    ],
                    therapist: [
                        `I'm hearing you. That's worth exploring. What brought this up for you?`,
                        `Thank you for sharing. I'm curious—what do you think is important about this?`,
                        `That's interesting. Can you help me understand your perspective on this?`
                    ]
                };
                reply = neutralResponses[mode][Math.floor(Math.random() * neutralResponses[mode].length)];
            }

            // Quick fallback response (no artificial delay)
            return res.json({
                reply,
                emotion,
                showHelpline: emotion === 'crisis',
                tokensUsed: 0
            });
        }

        // Call OpenRouter API with optimized settings
        console.log("🔄 Calling OpenRouter API...");
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'deepseek/deepseek-chat:free',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            max_tokens: 200,
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://chrcha-ai.web.app',
                'X-Title': 'Charcha AI'
            },
            timeout: 20000
        });
        
        console.log("✅ OpenRouter API response received");

        let rawReply = response.data.choices[0].message.content || response.data.choices[0].message.reasoning || "I'm here, but I didn't quite catch that. Let's try again?";
        // Strip out deepseek style thinking tags if they exist
        reply = rawReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        // Fallback if the whole message was just reasoning
        if (!reply || reply.length < 15) {
            reply = "I was thinking about that. " + rawReply.replace(/<think>|<\/think>/g, '').trim().substring(0, 80) + "...";
        }
        
        // Enhanced safety: Prevent AI from just repeating user's question back
        const userWords = message.toLowerCase().split(/\s+/).slice(0, 6).join(' ');
        const replyStart = reply.toLowerCase().substring(0, 60);
        const isMostlyEcho = replyStart.includes(userWords) && reply.length < 40;
        
        if (isMostlyEcho) {
            // If we detect echo, use mode-specific fallback
            const echoFallacks = {
                friend: `I appreciate you asking that. I want to really hear what's going on with you—can you tell me more about what you're thinking?`,
                parent: `That's a good question to think about. Help me understand what's really on your mind right now.`,
                therapist: `That's worth exploring deeper. What's your own sense about that? I'd like to hear your perspective.`
            };
            reply = echoFallacks[mode] || echoFallacks.friend;
        }
        
        const tokensUsed = response.data.usage?.total_tokens || 0;

        res.json({
            reply,
            emotion,
            showHelpline,
            tokensUsed
        });

    } catch (error) {
        // Log detailed error information for debugging
        console.error("Chat API Error Details:");
        console.error("- Error Code:", error.code);
        console.error("- Error Message:", error.message);
        console.error("- Response Data:", error.response?.data);
        console.error("- Response Status:", error.response?.status);
        
        if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
            console.warn("⏱️ Request timeout - likely slow API or network issue");
        } else if (error.response?.status === 401) {
            console.error("❌ Invalid API key! Check your OPENROUTER_API_KEY");
        } else if (error.response?.status === 429) {
            console.error("⚠️ Rate limit exceeded - too many requests");
        }
        
        console.warn("Falling back to enriched response system...");
        
        // If API fails, use enriched fallback responses instead of error
        let reply = '';

        // Crisis takes absolute priority
        if (emotion === 'crisis') {
            reply = mode === 'friend'
                ? `${memory?.name || 'Hey'}, I'm so grateful you told me. I'm right here with you—you're not alone in this. This feeling won't last forever. Please call iCall (9152987821) or Vandrevala (1860-2662-345) right now. They're ready to help. I'm with you.`
                : mode === 'parent'
                    ? `Oh my dear, I'm so glad you reached out to me. Listen to me: you matter, your life matters, and this pain is temporary. I'm right here with you. Please call iCall (9152987821) immediately—they'll help. You're not going through this alone.`
                    : `I'm really grateful you said this. I'm here with you right now, and you don't have to face this alone. Let's ground you—take a breath with me. Can you tell me what's happening? iCall (9152987821) is ready to help. Please reach out.`;
        }
        // Sadness - 4-step: Acknowledge pain → Validate → Explore gently → Support
        else if (emotion === 'sadness') {
            const sadnessResponses = {
                friend: [
                    `Hey... that sounds really heavy. I can feel the weight in what you're saying. You're allowed to feel this way, and I'm here with you. What's been making it hit so hard?`,
                    `I hear you. That must be tough on you. I want you to know you're not carrying this alone. What's going on?`,
                    `That sounds painful, and I'm sorry you're going through this. Tell me more—I'm listening, and I'm here.`
                ],
                parent: [
                    `I can see you're hurting right now, and that's completely okay. You don't have to be strong all the time with me. I'm so proud of you for opening up. What's weighing on your heart?`,
                    `My dear, I hear that you're struggling. That's not weakness—that's you being honest with me. I'm here. Tell me what you need.`,
                    `I can feel your pain. You matter so much to me. Let's talk about what's really going on.`
                ],
                therapist: [
                    `It sounds like you're in a lot of pain right now, and that feeling is real and valid. What you're experiencing matters. Can you help me understand what brought this on?`,
                    `I'm hearing that something heavy is sitting with you. That's significant. What's the core of what you're feeling?`,
                    `The sadness you're describing—can you tell me more about when it started, or what triggered it?`
                ]
            };
            reply = sadnessResponses[mode][Math.floor(Math.random() * sadnessResponses[mode].length)];
        }
        // Anger - 4-step: Acknowledge anger → Validate → Explore hurt → Support
        else if (emotion === 'anger') {
            const angerResponses = {
                friend: [
                    `Yeah, I get why you're upset. That's completely fair. That would frustrate anyone. Help me understand what's really going on underneath?`,
                    `Your anger makes total sense. You have every right to feel that way. What's the main thing that got under your skin?`,
                    `I can hear the frustration. That's valid. Talk to me—what happened?`
                ],
                parent: [
                    `I hear your frustration, and it's valid. Your feelings matter. Let's talk about what's really bothering you—sometimes anger is telling us something important.`,
                    `I can see you're upset, and you have a right to be. Help me understand what's going on so I can support you.`,
                    `Your anger is telling me something matters to you. I'm listening. What's at the core of this?`
                ],
                therapist: [
                    `Your anger makes sense. It's often protecting something deeper. What do you think the hurt behind this frustration might be?`,
                    `I'm hearing real frustration here. That's valid. What would you want me to understand about your situation?`,
                    `The anger you're expressing—what do you think it's trying to protect in you?`
                ]
            };
            reply = angerResponses[mode][Math.floor(Math.random() * angerResponses[mode].length)];
        }
        // Anxiety - 4-step: Acknowledge overwhelm → Ground → Explore fear → Support
        else if (emotion === 'anxiety') {
            const anxietyResponses = {
                friend: [
                    `I can tell you're spiraling a bit, and that's okay—anxiety does that. Let's slow down for a second. What's the main thing that's got your mind racing?`,
                    `Hey, I get it. Your mind's in overdrive. Let's ground you—take a breath with me. What's the biggest worry right now?`,
                    `You sound overwhelmed, and that makes sense. I'm here. What's the core anxiety you're sitting with?`
                ],
                parent: [
                    `I can see you're feeling really overwhelmed right now. That's your mind trying to protect you, but it's working too hard. Take a breath with me. What's the main worry?`,
                    `My dear, I can feel your anxiety. Let's just pause for a moment. Tell me what's really scaring you right now.`,
                    `You're in worry mode, and that's understandable. I'm here. Let's talk about what's triggering this.`
                ],
                therapist: [
                    `Anxiety can feel overwhelming, and what you're experiencing is real. Let's ground you first—what's actually happening right now, in this moment?`,
                    `It sounds like your mind is working hard to protect you from something. Can you tell me what the core fear is?`,
                    `When you think about what's making you anxious, what's the specific fear underneath?`
                ]
            };
            reply = anxietyResponses[mode][Math.floor(Math.random() * anxietyResponses[mode].length)];
        }
        // Low self-worth - 4-step: Acknowledge struggle → Validate pain → Challenge story → Encourage
        else if (emotion === 'low_self_worth') {
            const selfWorthResponses = {
                friend: [
                    `Stop. You're being way too hard on yourself. Listen to me—you're not as bad as you think. What made you start feeling this way about yourself?`,
                    `I need you to hear this: you're not what you're thinking right now. You matter. What's the story you're telling yourself?`,
                    `Hey, I see you doubting yourself, and I need to push back. You're more valuable than you're giving yourself credit for.`
                ],
                parent: [
                    `I need you to know something: I believe in you, even when you don't believe in yourself. You're worthy of love and respect. What's making you doubt that?`,
                    `My dear, you're being so hard on yourself. I see your strength even when you can't see it. Let's talk about what changed.`,
                    `Listen to me: you are valuable, you matter, and you deserve kindness—especially from yourself. What happened?`
                ],
                therapist: [
                    `It sounds like you're really struggling with how you see yourself right now. That's a significant feeling. What story have you been telling yourself?`,
                    `I hear the self-doubt. That's painful. Can you help me understand where this belief about yourself came from?`,
                    `When you say that about yourself, where do you think that thought originated?`
                ]
            };
            reply = selfWorthResponses[mode][Math.floor(Math.random() * selfWorthResponses[mode].length)];
        }
        // Default to neutral
        else {
            const neutralResponses = {
                friend: [
                    `I hear you. That's interesting. Tell me more about what you're experiencing.`,
                    `Got it. I'm genuinely curious—what's been on your mind about this?`,
                    `That makes sense. What would you like to talk about?`
                ],
                parent: [
                    `Thank you for sharing that with me. I'm listening. What else do you want me to know?`,
                    `I appreciate you telling me. Help me understand more.`,
                    `That's important. What's making you think about this right now?`
                ],
                therapist: [
                    `I'm hearing you. That's worth exploring. What brought this up for you?`,
                    `Thank you for sharing. I'm curious—what do you think is important about this?`,
                    `That's interesting. Can you help me understand your perspective on this?`
                ]
            };
            reply = neutralResponses[mode][Math.floor(Math.random() * neutralResponses[mode].length)];
        }
        
        res.json({
            reply,
            emotion,
            showHelpline: emotion === 'crisis',
            tokensUsed: 0,
            source: 'fallback'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Charcha AI backend running on port ${PORT}`);
});
