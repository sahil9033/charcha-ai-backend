import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Minimal emotion keywords for local detection fallback
const EMOTIONS = {
    sadness: ['sad', 'alone', 'useless', 'empty', 'hopeless', 'crying'],
    anger: ['angry', 'frustrated', 'hate', 'unfair', 'furious'],
    anxiety: ['anxious', 'scared', 'panic', 'breathe', 'worried', 'stress'],
    low_motivation: ['tired', 'give up', 'pointless'],
    crisis: ['suicide', 'kill myself', 'end it', 'die', 'want to live']
};

function detectEmotion(text) {
    const t = text.toLowerCase();
    for (const [emo, keywords] of Object.entries(EMOTIONS)) {
        if (keywords.some(k => t.includes(k))) return emo;
    }
    return 'neutral';
}

const SYSTEM_PROMPTS = {
    therapist: `Calm, reflective, non-judgemental. Ask open-ended questions. Mirror emotions. Avoid advice-giving unless asked.
For philosophical/general questions: Explore the deeper meaning behind the question. Share thoughtful insights. Connect it to their life context if possible.
Example: If asked "what is life", respond with reflective thoughts about meaning, purpose, growth—inviting them to explore their own definition.`,
    friend: `Casual, warm, slightly humorous. Talk like a close friend. Use casual language. Validate feelings. Share relatable perspectives.
For philosophical/general questions: Share your own relatable take. Make it personal and engaging. Add light humor if appropriate.
Example: If asked "what is life", give a genuine, friendly perspective that invites conversation.`,
    parent: `Warm, protective, gently firm. Be nurturing and unconditionally supportive. Offer guidance with love, not criticism.
For philosophical/general questions: Share wisdom gained from experience. Guide them toward reflection. Make it age-appropriate and encouraging.
Example: If asked "what is life", share perspective on growth, learning, and meaning from a caring guardian's viewpoint.`
};

app.post('/api/chat', async (req, res) => {
    const { userId, message, mode, memory, isEmergency } = req.body;

    let emotion = detectEmotion(message);
    let showHelpline = emotion === 'crisis' || isEmergency;
    if (isEmergency) emotion = 'crisis';

    const persona = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.friend;

    const systemPrompt = `SYSTEM: You are Charcha — an AI companion in ${mode} mode.
${persona}
User's name: ${memory?.name || 'Friend'}
Recent context: ${memory?.lastProblem || 'None'}
Detected emotion: ${emotion}

GUIDELINES:
- Don't ever repeat or echo back the user's question.
- Always provide thoughtful, genuine responses that address what they asked.
- Keep replies under 80 words, but prioritize quality over brevity.
- Never diagnose or dismiss. Validate their curiosity and emotions.
- For emotional/crisis content: Always include Indian helplines (iCall 9152987821, Vandrevala Foundation 1860-2662-345).
- For philosophical questions: Offer genuine insights that feel personal and help them reflect.
─────────────────────────────`;

    try {
        let reply = '';

        // If no API key, use fallback mocks
        if (!OPENROUTER_API_KEY) {
            console.warn("No OPENROUTER_API_KEY provided. Using mock response.");
            
            // Check if it's a philosophical/general question
            const philosophicalKeywords = ['what is', 'why', 'how do', 'who are', 'when should', 'meaning', 'purpose', 'life', 'death', 'love', 'success', 'happiness'];
            const isPhilosophical = philosophicalKeywords.some(keyword => message.toLowerCase().includes(keyword));
            
            // Simple mock AI logic based on emotion and question type
            if (showHelpline) {
                reply = `I hear how much pain you're in right now, ${memory.name}. You are not alone and things can get better. Please reach out to iCall (9152987821) or Vandrevala Foundation (1860-2662-345). I'm here to listen as long as you need.`;
            } else if (isPhilosophical) {
                // Handle philosophical questions better
                if (message.toLowerCase().includes('what is life')) {
                    reply = mode === 'friend'
                        ? `You know, I think life is about the moments that matter—with people you care about, doing things that excite you. It's messy, but that's what makes it real. What does life mean to you?`
                        : mode === 'parent'
                            ? `Life, my dear, is about growth, love, and impact. It's the journey of becoming who you're meant to be, surrounded by those you cherish. What feels meaningful to you right now?`
                            : `That's a beautiful question, ${memory.name}. Life is what each of us makes it—a combination of connection, purpose, growth, and moments of joy. What prompted you to think about this?`;
                } else {
                    reply = mode === 'friend'
                        ? `That's a great question, ${memory.name}. Honestly, I think... tell me what you're thinking about this?`
                        : mode === 'parent'
                            ? `I'm so glad you're asking these questions, beta. These thoughts show you're growing. What's making you wonder about this?`
                            : `What a thoughtful question. Take a moment and share what brought this up for you—I'd like to understand more.`;
                }
            } else if (emotion === 'sadness') {
                reply = `That sounds really heavy, ${memory.name}. It's completely okay to feel sad about this. I'm right here with you. Do you want to talk more about what's hurting?`;
            } else if (emotion === 'anxiety') {
                reply = `I can tell you're feeling really overwhelmed. Let's take a slow, deep breath together. It's going to be okay. What is the biggest thing on your mind?`;
            } else {
                reply = mode === 'friend'
                    ? `Hey ${memory.name}, I hear you. That makes complete sense. Tell me more.`
                    : mode === 'parent'
                        ? `I'm proud of you for sharing this, Beta. I'm always here to support you. What happened next?`
                        : `Thank you for sharing that with me, ${memory.name}. How did that make you feel?`;
            }

            // Artificial delay for realism
            await new Promise(r => setTimeout(r, 1500));

            return res.json({
                reply,
                emotion,
                showHelpline,
                tokensUsed: 0
            });
        }

        // Call OpenRouter API
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            max_tokens: 300,
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://chrcha-ai.web.app',
                'X-Title': 'Charcha AI'
            }
        });

        let rawReply = response.data.choices[0].message.content || response.data.choices[0].message.reasoning || "I'm here, but I didn't quite catch that. Could you say it again?";
        // Strip out deepseek style thinking tags if they exist
        reply = rawReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        // Fallback if the whole message was just reasoning
        if (!reply) {
            reply = "I was just thinking about that. " + rawReply.replace(/<think>|<\/think>/g, '').trim().substring(0, 100) + "...";
        }
        
        // Safety check: if reply is too similar to the user message (echo), regenerate
        const similarity = reply.toLowerCase().includes(message.toLowerCase().slice(0, 10));
        if (similarity && reply.length < 30) {
            reply = `I appreciate you asking that, ${memory?.name || 'buddy'}. Let me think more deeply about this. Can you share what's on your mind?`;
        }
        
        const tokensUsed = response.data.usage?.total_tokens || 0;

        res.json({
            reply,
            emotion,
            showHelpline,
            tokensUsed
        });

    } catch (error) {
        console.error("OpenRouter API Error:", error?.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Charcha AI backend running on port ${PORT}`);
});
