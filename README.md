# PC Builder AI 🖥️⚡

Premium, **AI-powered PC configurator** with a fully interactive **3D build viewer**.
Chat with an AI consultant, drop in components, and watch your rig come together in
real-time 3D — compatibility checks, performance estimates, presets and more.

> Porsche-inspired dark UI · React + Three.js · multi-provider AI · TR/EN

---

## ✨ Features

- **AI Chat Consultant** — describe your needs, get part recommendations you can add
  to the build with one click. Works with **any OpenAI-compatible provider**
  (OpenAI, Groq, Google Gemini, OpenRouter, local Ollama) or **Anthropic / Claude**.
- **Interactive 3D Build** — every part rendered in detail (CPU dies, GPU fans, RAM
  slots, motherboard pins…). Left-click a part to inspect, right-drag to rotate.
- **Exploded View** — parts fan out of the case with smooth spring animations.
- **5 Case Models** — each with its own dimensions, fan layout and glass/RGB styling.
- **Real Compatibility Engine** — socket match, RAM generation, form factor, cooler
  capacity, PSU wattage & headroom — with clear errors/warnings.
- **Performance Estimates** — approximate FPS per game/resolution, CPU↔GPU
  bottleneck, and a power-draw breakdown.
- **Presets** — hand-tuned builds (The Destroyer, Sweet Spot, Budget Dominator…).
- **Parts Browser** — filter by category/tier, search, add to build.
- **Share & Export** — shareable URL, CSV (BOM), named saved builds.
- **Live RGB Control + Screenshot (PNG)** of the 3D scene.
- **TR / EN** language toggle.

## 🧱 Tech Stack

React 18 · TypeScript · Vite · Tailwind CSS · Three.js (`@react-three/fiber` +
`drei`) · Framer Motion · GSAP · TanStack Query · Express (AI proxy).

## 🚀 Getting Started

```bash
npm install
cp .env.example .env     # then add an API key (see below)
npm run dev              # Vite (5173) + Express proxy (3001)
```

Open http://localhost:5173

## 🔑 AI Provider (pick one)

The key lives **only** in `.env` on the Express server — it is never exposed to the
browser. The server auto-selects a provider: if `OPENAI_API_KEY` is set it uses the
OpenAI-compatible path, otherwise Anthropic/Claude.

**Free options** (see `.env.example` for all):

```env
# Groq — free & fast (console.groq.com/keys)
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile
```

Other supported: Google Gemini (free tier), OpenRouter (`:free` models), local
Ollama, OpenAI (`gpt-4o-mini`), or Anthropic (`ANTHROPIC_API_KEY`).

## 🔒 Security

- `.env` is git-ignored — your key is **not** committed.
- The client only calls the local `/api/chat` proxy; the key stays server-side.
- ⚠️ If you share the folder as a **zip**, delete `.env` first (`.gitignore` only
  affects git). Use `.env.example` as the template.

## 📦 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite + Express together |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |

## 🧩 Real 3D Models (optional)

Procedural models are used by default. Drop `.glb` files into `public/models/` and
register them in `src/components/3D/modelRegistry.ts` to use photoreal assets — it
falls back to procedural automatically if a file is missing.


