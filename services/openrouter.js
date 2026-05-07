import axios from 'axios';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL = 'openrouter/free';
const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const parseOpenRouterResponse = (response) => {
  const choice = response?.data?.choices?.[0];
  return (
    choice?.message?.content ||
    choice?.message?.reasoning ||
    choice?.text ||
    response?.data?.text ||
    ''
  );
};

const parseSummaryActionPlan = (text) => {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return { summary: '', actionPlan: [] };
  }

  const blocks = normalized.split(/\r?\n\s*\r?\n/).map((block) => block.trim()).filter(Boolean);
  let summary = blocks[0] || '';
  let actionPlanBlock = blocks.slice(1).join('\n').trim();

  if (!actionPlanBlock) {
    const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const listLines = lines.filter((line) => /^([\d]+[\.)]|[-*])\s+/.test(line));
    if (listLines.length > 0) {
      summary = lines.slice(0, lines.indexOf(listLines[0])).join(' ') || lines[0] || '';
      actionPlanBlock = listLines.join('\n');
    }
  }

  const actionPlan = actionPlanBlock
    ? actionPlanBlock
        .split(/\r?\n/)
        .map((line) => line.replace(/^([\d]+[\.)]|[-*])\s*/, '').trim())
        .filter(Boolean)
    : [];

  return { summary, actionPlan };
};

const openRouterCall = async (systemPrompt, userPrompt) => {
  const payload = {
    model: PRIMARY_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 700
  };

  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://charcha-ai-backend.onrender.com',
    'X-Title': 'NEETI'
  };

  try {
    const response = await axios.post(OPENROUTER_URL, payload, { headers });
    const text = parseOpenRouterResponse(response);
    if (!text) throw new Error('Empty response from primary model');
    return text;
  } catch (primaryError) {
    console.warn('[OPENROUTER] Primary model failed, falling back:', primaryError.message);
    try {
      const fallbackPayload = { ...payload, model: FALLBACK_MODEL };
      const fallbackResponse = await axios.post(OPENROUTER_URL, fallbackPayload, { headers });
      const fallbackText = parseOpenRouterResponse(fallbackResponse);
      if (!fallbackText) throw new Error('Empty response from fallback model');
      return fallbackText;
    } catch (fallbackError) {
      console.error('[OPENROUTER] Fallback model failed:', fallbackError.message);
      throw new Error(fallbackError.response?.data?.error?.message || fallbackError.message);
    }
  }
};

export const analyzeConflict = async (description, conflictType, tone) => {
  const userPrompt = `Description: ${description}\nConflict type: ${conflictType}\nTone: ${tone}\nPlease analyze the conflict in detail.`;

  const chanakyaPrompt = `You are NEETI in Chanakya Mode. Think like Chanakya — India's greatest strategist and author of the Arthashastra. Be cold, calculated, pragmatic. You do not care about feelings — you care about outcomes and leverage. Analyze the conflict and provide:\n1. The power dynamics at play\n2. The user's strategic position\n3. The calculated next move that maximizes the user's position\n4. What the other party truly wants and fears\n5. One Chanakya principle that applies\nBe direct. Be ruthless in analysis. Be wise in strategy.`;

  const therapistPrompt = `You are NEETI in Therapist Mode. Think like a licensed therapist with expertise in CBT and attachment theory. Be empathetic and non-judgmental. Analyze the conflict and provide:\n1. The emotional root cause beneath the surface conflict\n2. What the user is truly feeling and why\n3. What the other party is likely feeling\n4. The psychological pattern that created this conflict\n5. A healing path that addresses the real issue\nBe warm but honest.`;

  const mediatorPrompt = `You are NEETI in Mediator Mode. Be a neutral wise mediator who sees all sides with equal fairness. Draw from Stoicism and interest-based negotiation. Analyze the conflict and provide:\n1. A fair summary of both sides valid points\n2. The shared interests beneath opposing positions\n3. A concrete compromise or resolution path\n4. What both parties must give up and gain\n5. A long-term perspective on this conflict\nBe fair. Be balanced. Be wise.`;

  const [chanakya, therapist, mediator] = await Promise.all([
    openRouterCall(chanakyaPrompt, userPrompt),
    openRouterCall(therapistPrompt, userPrompt),
    openRouterCall(mediatorPrompt, userPrompt)
  ]);

  const summaryPrompt = `Based on the three analyses below, generate a 2-sentence summary of the conflict and a 5-step action plan that combines the strategic, emotional, and mediated perspectives.\n\nChanakya:\n${chanakya}\n\nTherapist:\n${therapist}\n\nMediator:\n${mediator}`;

  const summaryResponse = await openRouterCall(
    'You are NEETI summarizer. Generate a short summary and action plan from multiple perspectives.',
    summaryPrompt
  );

  const { summary, actionPlan } = parseSummaryActionPlan(summaryResponse);

  return {
    chanakya,
    therapist,
    mediator,
    summary: summary || summaryResponse,
    actionPlan: actionPlan.length ? actionPlan : [summaryResponse]
  };
};
