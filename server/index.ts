import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const app = express()
const port = process.env.PORT ?? 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json({ limit: '1mb' }))

// ─── Provider selection ───────────────────────────────────────────────────────
// Any OpenAI-compatible endpoint works (OpenAI, Groq, Google Gemini, OpenRouter,
// local Ollama/LM Studio). Set OPENAI_API_KEY (+ optional OPENAI_BASE_URL /
// OPENAI_MODEL) in .env to use it; otherwise falls back to Anthropic/Claude.

const PROVIDER =
  process.env.AI_PROVIDER ??
  (process.env.OPENAI_API_KEY ? 'openai' : 'anthropic')

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ChatBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  systemPrompt: string
  model: string
}

app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt, model } = req.body as ChatBody

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    if (PROVIDER === 'openai') {
      await streamOpenAICompatible({ messages, systemPrompt, sendEvent })
    } else {
      await streamAnthropic({ messages, systemPrompt, model, sendEvent })
    }
    sendEvent({ type: 'done' })
    res.end()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[server] Error:', message)
    sendEvent({ type: 'error', error: message })
    res.end()
  }
})

// ─── Anthropic (Claude) ───────────────────────────────────────────────────────

async function streamAnthropic({
  messages, systemPrompt, model, sendEvent,
}: {
  messages: ChatBody['messages']
  systemPrompt: string
  model: string
  sendEvent: (d: object) => void
}) {
  const stream = anthropic.messages.stream({
    model: model ?? 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      sendEvent({ type: 'delta', text: event.delta.text })
    }
  }
}

// ─── OpenAI-compatible (OpenAI / Groq / Gemini / OpenRouter / local) ──────────

async function streamOpenAICompatible({
  messages, systemPrompt, sendEvent,
}: {
  messages: ChatBody['messages']
  systemPrompt: string
  sendEvent: (d: object) => void
}) {
  const resp = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 4096,
    }),
  })

  if (!resp.ok || !resp.body) {
    const detail = await resp.text().catch(() => '')
    throw new Error(`${OPENAI_MODEL} request failed (${resp.status}): ${detail.slice(0, 300)}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '' || data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const text = json.choices?.[0]?.delta?.content
        if (text) sendEvent({ type: 'delta', text })
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
}

app.listen(port, () => {
  const label = PROVIDER === 'openai' ? `OpenAI-compatible (${OPENAI_MODEL} @ ${OPENAI_BASE_URL})` : 'Anthropic (Claude)'
  console.log(`\x1b[33m[server]\x1b[0m Express proxy on http://localhost:${port} — provider: ${label}`)
})
