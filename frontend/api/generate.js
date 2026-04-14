export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
      'die','died','death','passed away','funeral','grief','loss','terminal',
      'cancer','sick','ill','illness','hospital','surgery','diagnosed',
      'suicide','self-harm',
    ]

    const allowSensitive = sensitiveKeywords.some(k => userText.includes(k))

    // tone & length hints
    const toneLine =
      tone === 'warm'
        ? 'Use a gentle, warm, emotionally supportive tone.'
        : tone === 'light'
        ? 'Use a light, calm, respectful tone.'
        : tone === 'calm'
        ? 'Use a calm, steady, grounded tone.'
        : 'Use a neutral, descriptive tone.'

    const lengthHint =
      length === 'short'
        ? 'Keep it to a few short sentences.'
        : length === 'medium'
        ? 'Write one short paragraph.'
        : 'Write at most two short paragraphs.'

    // safety gate
    const safetyBlock = allowSensitive
      ? `
Sensitive content allowed: YES.
The user has explicitly mentioned illness, death, or loss.
- Avoid graphic detail.
- Keep the tone gentle and non-dramatic.
`.trim()
      : `
Sensitive content allowed: NO.

SAFETY CONSTRAINTS (must follow strictly):
- Do NOT introduce illness, death, dying, accidents, abuse, self-harm, violence, or tragedy.
- Do NOT imply anyone is sick, terminally ill, or has passed away.
- Do NOT add dramatic twists or negative assumptions.
- If information is missing, stay vague or omit it.
- Never speculate beyond what the user provided.
`.trim()

    // build prompt
    const promptList =
      Array.isArray(prompts) && prompts.length
        ? `Prompt cards selected: ${JSON.stringify(prompts)}`
        : 'No prompt cards were selected.'

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

Write ONE draft that the user can freely edit.
Return ONLY the story text.
Do NOT include titles, headings, explanations, or meta commentary.
`.trim()

    // OpenAI request
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' })
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are a careful, safety-aware writing assistant.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!r.ok) {
      const t = await r.text()
      return res.status(500).json({
        error: 'OpenAI request failed',
        detail: t,
      })
    }

    const data = await r.json()

    const draft = data?.choices?.[0]?.message?.content || ''

    return res.status(200).json({
      draft,
      meta: {
        allowSensitive,
        provider: 'openai',
        model: 'gpt-5',
      },
    })
  } catch (e) {
    return res.status(500).json({
      error: 'Failed to generate draft',
      detail: String(e?.message || e),
    })
  }
}
