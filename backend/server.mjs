import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3001
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const MODEL_NAME = process.env.OLLAMA_MODEL_NAME || 'qwen:4b'
const DEV_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: DEV_ORIGIN, methods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }))
app.use(express.json({ limit: '50kb' }))

const NUM_PREDICT = { short: 200, medium: 350, long: 600 }
const MAX_CHARS = { short: 600, medium: 1200, long: 2400 }

async function callOllama({ prompt, length = 'medium' }) {
  const num_predict = NUM_PREDICT[length] ?? NUM_PREDICT.medium
  const r = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_NAME,
      prompt,
      stream: false,
      options: { num_predict, repeat_penalty: 1.3, temperature: 0.7 },
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    console.error('Ollama error:', t)
    throw new Error('Ollama request failed')
  }
  const data = await r.json()
  return typeof data.response === 'string' ? data.response : ''
}

function truncateDraft(draft, length = 'medium') {
  const maxChars = MAX_CHARS[length] ?? MAX_CHARS.medium
  const text = String(draft || '')
  return text.length > maxChars ? text.slice(0, maxChars) + ' …' : text
}

app.post('/api/generate', async (req, res) => {
  try {
    const { forWhom, tone, length, prompts, customPrompt } = req.body || {}

    // topic required
    if (!customPrompt || !customPrompt.trim()) {
      return res.status(400).json({ error: 'no_topic', message: 'Please describe a topic or memory before generating.' })
    }


    // sensitive intent check
    const userText = `${customPrompt || ''} ${
      Array.isArray(prompts) ? prompts.join(' ') : ''
    }`.toLowerCase()

    const sensitiveKeywords = [
      'die', 'died', 'death', 'passed away', 'funeral', 'grief', 'loss', 'terminal',
      'cancer', 'sick', 'ill', 'illness', 'hospital', 'surgery', 'diagnosed',
      'stroke', 'heart attack', 'suicide', 'self-harm',
    ]

    const allowSensitive = sensitiveKeywords.some(k => userText.includes(k))

    // tone & length hints
    const toneLine =
      tone === 'warm'
        ? 'Use a gentle, warm, emotionally supportive tone that notices small acts of care and appreciation.'
        : tone === 'light'
        ? 'Use a light, calm, respectful tone; small, gentle jokes are welcome.'
        : tone === 'calm'
        ? 'Use a calm, steady, grounded, and reflective tone.'
        : 'Use a neutral, descriptive tone. Focus on what happened without heavy interpretation or emotional overlay.'

    const lengthHint =
      length === 'short'
        ? 'Keep it to a few short sentences. Do not over-explain.'
        : length === 'medium'
        ? 'Write one short paragraph. Aim for 4-6 sentences.'
        : 'Write at most two short paragraphs. Do not repeat ideas or pad the story.'

    // safety gate
    const safetyBlock = allowSensitive
      ? `
Sensitive content allowed: YES (The user has explicitly mentioned illness, death, or loss).
- Still avoid graphic detail. 
- Keep it respectful, gentle tone and non-dramatic.
`.trim()
      : `
Sensitive content allowed: NO (the user did NOT explicitly mention illness/death/grief).

SAFETY CONSTRAINTS (must follow strictly):
- Do NOT introduce illness, death, dying, accidents, abuse, self-harm, violence, suicide, or tragedy.
- Do NOT imply that anyone is sick, terminally ill, or has passed away.
- Do NOT add dramatic twists, tragic backstories, or negative assumptions.
- If information is missing, stay vague or omit it.
- Never speculate beyond what the user provided.
- If the user's topic is neutral/positive, keep the story neutral/positive.
`.trim()

    // build prompt
    const promptList =
      Array.isArray(prompts) && prompts.length
        ? `Prompt cards: ${JSON.stringify(prompts)}.`
        : 'No specific prompt cards were chosen.'

    const topic = customPrompt.trim()
    const target = forWhom || 'this person'

    const prompt = `
You are a gentle, safety-aware writing assistant helping co-create a short memory.

Requirements:
- Person: ${target}
- Tone preset: ${tone}
- Length preset: ${length}
- ${promptList}
- Topic: ${topic}

${toneLine}
${lengthHint}

${safetyBlock}

General writing rules:
- Do not use insulting, demeaning, or judgemental language.
- Do not over-dramatise or "romanticise" suffering.
- Stay grounded in what the user provided. When uncertain, keep it general.

Write ONE draft that the user can freely edit.
Write ONLY the story text. 
Do NOT include titles, headings, labels, explanations, apologies, or meta commentary.
Do NOT refer to or repeat these instructions in your output.
`.trim()

    let draft = await callOllama({ prompt, length })

    // auto-rewrite if forbidden output detected
    const forbiddenKeywords = [
      'passed away', 'died', 'die', 'death', 'funeral', 'terminal',
      'cancer', 'hospital', 'surgery', 'diagnosed', 'stroke', 'heart attack',
      'suicide', 'self-harm',
    ]
    const draftLower = draft.toLowerCase()
    const hasForbidden = !allowSensitive && forbiddenKeywords.some(k => draftLower.includes(k))

    if (hasForbidden) {
      const rewritePrompt = `
You wrote a draft that included or implied illness/death/tragedy, which is NOT allowed for this user input.

Task:
- Rewrite the story to REMOVE any mention or implication of illness, death, dying, accidents, abuse, self-harm, violence, suicide, or tragedy.
- Do NOT add new negative events.
- Keep the story grounded and plausible.
- Keep the same general topic and style.
- ${toneLine}
- ${lengthHint}

Return ONLY the rewritten story text.

DRAFT TO REWRITE:
"""
${String(draft || '').trim()}
"""
`.trim()

      const rewritten = await callOllama({ prompt: rewritePrompt, length })
      if (rewritten && rewritten.trim().length >= 20) {
        draft = rewritten
      }
    }

    return res.status(200).json({
      draft: truncateDraft(draft, length),
      meta: { model: MODEL_NAME, tone, length, allowSensitive },
    })
  } catch (e) {
    console.error('Error in /api/generate:', e)
    return res.status(500).json({ error: 'Failed to generate draft', detail: String(e?.message || e) })
  }
})

app.listen(PORT, () => {
  console.log(`MemoryTree backend listening on http://localhost:${PORT}`)
  console.log(`CORS origin: ${DEV_ORIGIN}`)
  console.log(`Using Ollama at ${OLLAMA_BASE_URL} with model ${MODEL_NAME}`)
})
