import type { Build, PartCategory } from '../types'

// ─── Relative performance scores (heuristic, ~real-world gaming) ──────────────

const GPU_SCORE: Record<string, number> = {
  'rtx-5090': 100, 'rtx-5080': 76, 'rtx-5070-ti': 60, 'rtx-5070': 48,
  'rtx-4090': 86, 'rtx-4070-super': 46, 'rx-7900-xtx': 68, 'rtx-4060': 26,
}
const GPU_TIER_FALLBACK: Record<string, number> = { budget: 25, mid: 38, 'high-end': 55, enthusiast: 80 }

const CPU_SCORE: Record<string, number> = {
  'intel-i9-14900k': 100, 'amd-ryzen-9-9950x': 98, 'intel-ultra9-285k': 95,
  'intel-i7-14700k': 92, 'amd-ryzen-7-9700x': 90, 'intel-ultra7-265k': 88,
  'amd-ryzen-5-7600x': 76,
}
const CPU_TIER_FALLBACK: Record<string, number> = { budget: 70, mid: 80, 'high-end': 90, enthusiast: 96 }

export type Resolution = '1080p' | '1440p' | '4k'
const RES_FACTOR: Record<Resolution, number> = { '1080p': 1.0, '1440p': 1.7, '4k': 3.4 }
export const RES_LABEL: Record<Resolution, string> = { '1080p': '1080p', '1440p': '1440p', '4k': '4K' }

export interface GameDef { id: string; name: string; demand: number; cap: number }
export const GAMES: GameDef[] = [
  { id: 'cyberpunk', name: 'Cyberpunk 2077', demand: 2.0, cap: 360 },
  { id: 'cod', name: 'Call of Duty', demand: 1.15, cap: 360 },
  { id: 'fortnite', name: 'Fortnite', demand: 0.85, cap: 360 },
  { id: 'valorant', name: 'Valorant', demand: 0.32, cap: 600 },
  { id: 'eldenring', name: 'Elden Ring', demand: 1.3, cap: 60 },
]

export function gpuScore(build: Build): number | null {
  if (!build.gpu) return null
  return GPU_SCORE[build.gpu.id] ?? GPU_TIER_FALLBACK[build.gpu.tier] ?? 40
}
export function cpuScore(build: Build): number | null {
  if (!build.cpu) return null
  return CPU_SCORE[build.cpu.id] ?? CPU_TIER_FALLBACK[build.cpu.tier] ?? 80
}

const GPU_K = 4.6
const CPU_K = 4.6

export interface GameFps { game: GameDef; fps: number; limitedBy: 'gpu' | 'cpu' }

export function estimateFps(build: Build, res: Resolution): GameFps[] | null {
  const g = gpuScore(build)
  const c = cpuScore(build)
  if (g == null || c == null) return null
  const rf = RES_FACTOR[res]
  return GAMES.map(game => {
    const gpuFps = (g * GPU_K) / (game.demand * rf)
    const cpuFps = c * CPU_K // CPU frame ceiling, mostly resolution-independent
    let fps = Math.min(gpuFps, cpuFps)
    const limitedBy: 'gpu' | 'cpu' = gpuFps <= cpuFps ? 'gpu' : 'cpu'
    fps = Math.min(fps, game.cap)
    return { game, fps: Math.max(1, Math.round(fps)), limitedBy }
  })
}

export interface Bottleneck { limiter: 'cpu' | 'gpu' | 'balanced'; pct: number }

export function getBottleneck(build: Build): Bottleneck | null {
  const g = gpuScore(build)
  const c = cpuScore(build)
  if (g == null || c == null) return null
  const pct = Math.round((Math.abs(g - c) / Math.max(g, c)) * 100)
  if (pct <= 8) return { limiter: 'balanced', pct }
  // a much stronger GPU than CPU → CPU bottleneck, and vice-versa
  return { limiter: g > c ? 'cpu' : 'gpu', pct }
}

export interface PowerSlice { category: PartCategory; label: string; watts: number; pct: number; color: string }

export function powerBreakdown(build: Build, labels: Record<string, string>, colors: Record<string, string>): { slices: PowerSlice[]; total: number } {
  const order: PartCategory[] = ['gpu', 'cpu', 'motherboard', 'ram', 'storage', 'cooling']
  const total = order.reduce((s, c) => s + (build[c]?.tdp ?? 0), 0)
  const slices: PowerSlice[] = order
    .filter(c => (build[c]?.tdp ?? 0) > 0)
    .map(c => {
      const watts = build[c]!.tdp
      return { category: c, label: labels[c] ?? c, watts, pct: total ? (watts / total) * 100 : 0, color: colors[c] ?? '#888' }
    })
  return { slices, total }
}
