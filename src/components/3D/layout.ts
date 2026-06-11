// ─── PC interior layout engine ───────────────────────────────────────────────
// Computes a real, non-overlapping ATX layout per case. All component models are
// authored centered at their local origin, facing +Z, so they can be placed with
// these world transforms. Three vertical zones guarantee no overlap:
//   top zone  → CPU / cooler / RAM
//   mid zone  → GPU (vertical-mount style, fans facing the front glass)
//   bottom    → PSU shroud

export type V3 = [number, number, number]

export interface CaseCfg {
  id: string
  w: number; h: number; d: number
  frontFans: number
  topFans: number
  sideFans: number
  bottomFans: number
  glassOpacity: number
  glassColor: string
  accentColor: string
  frameColor: string
  glassPanel: 'side' | 'front' | 'dual' | 'full360'
}

export const CASE_CONFIGS: Record<string, CaseCfg> = {
  'lian-li-o11-dynamic': {
    id: 'lian-li-o11-dynamic',
    w: 1.10, h: 1.32, d: 0.98,
    frontFans: 0, topFans: 3, sideFans: 3, bottomFans: 3,
    glassOpacity: 0.08, glassColor: '#aaddff',
    accentColor: '#aaaaaa', frameColor: '#1a1a1a',
    glassPanel: 'dual',
  },
  'fractal-torrent': {
    id: 'fractal-torrent',
    w: 0.92, h: 1.46, d: 0.74,
    frontFans: 3, topFans: 0, sideFans: 0, bottomFans: 2,
    glassOpacity: 0.06, glassColor: '#bbccdd',
    accentColor: '#cccccc', frameColor: '#111111',
    glassPanel: 'side',
  },
  'nzxt-h9-elite': {
    id: 'nzxt-h9-elite',
    w: 1.04, h: 1.42, d: 0.96,
    frontFans: 0, topFans: 2, sideFans: 0, bottomFans: 4,
    glassOpacity: 0.10, glassColor: '#ddeeff',
    accentColor: '#ffffff', frameColor: '#222222',
    glassPanel: 'full360',
  },
  'corsair-5000d': {
    id: 'corsair-5000d',
    w: 0.98, h: 1.40, d: 0.86,
    glassOpacity: 0.07, glassColor: '#ccddee',
    frontFans: 3, topFans: 3, sideFans: 0, bottomFans: 0,
    accentColor: '#ffcc00', frameColor: '#0a0a0a',
    glassPanel: 'side',
  },
  'bequiet-silent-base': {
    id: 'bequiet-silent-base',
    w: 0.96, h: 1.36, d: 0.76,
    frontFans: 0, topFans: 0, sideFans: 0, bottomFans: 3,
    glassOpacity: 0.05, glassColor: '#bbbbcc',
    accentColor: '#ff6600', frameColor: '#141414',
    glassPanel: 'side',
  },
  default: {
    id: 'default',
    w: 0.98, h: 1.36, d: 0.78,
    frontFans: 2, topFans: 2, sideFans: 0, bottomFans: 0,
    glassOpacity: 0.07, glassColor: '#aaccee',
    accentColor: '#888888', frameColor: '#111111',
    glassPanel: 'side',
  },
}

export function getCaseCfg(id?: string): CaseCfg {
  return (id && CASE_CONFIGS[id]) || CASE_CONFIGS.default
}

export interface PCLayout {
  backZ: number
  mobo: { pos: V3; w: number; h: number }
  cpu: V3
  cooler: V3
  ram: V3
  gpu: V3
  storage: V3
  psu: V3
  shroudY: number
  shroudH: number
}

export function computeLayout(cfg: CaseCfg): PCLayout {
  const ih = cfg.h - 0.05
  const id = cfg.d - 0.05

  // Motherboard plane sits just in front of the back wall
  const backZ = -id / 2 + 0.06

  // Vertical zoning (guarantees separation by construction)
  const psuY = -ih / 2 + 0.12          // PSU shroud center
  const gpuY = psuY + 0.30             // GPU above shroud with gap
  const cpuY = gpuY + 0.30             // CPU well above GPU

  // Motherboard spans from a bit below GPU up to above CPU
  const moboTop = cpuY + 0.20
  const moboBottom = gpuY - 0.12
  const moboH = moboTop - moboBottom
  const moboCenterY = (moboTop + moboBottom) / 2
  const moboW = 0.62
  const moboCenterX = -0.02

  return {
    backZ,
    mobo: { pos: [moboCenterX, moboCenterY, backZ], w: moboW, h: moboH },
    // local component anchors (relative to mobo center, then to world)
    cpu:     [moboCenterX - 0.08, cpuY, backZ + 0.025],
    cooler:  [moboCenterX - 0.08, cpuY, backZ + 0.05],
    ram:     [moboCenterX + 0.18, cpuY + 0.02, backZ + 0.03],
    gpu:     [moboCenterX + 0.02, gpuY, backZ + 0.11],
    storage: [moboCenterX - 0.04, (cpuY + gpuY) / 2, backZ + 0.018],
    psu:     [moboCenterX, psuY, backZ + 0.10],
    shroudY: psuY,
    shroudH: 0.20,
  }
}

// ─── Rotation helper ──────────────────────────────────────────────────────────

export function rotateY(v: V3, angle: number): V3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
}

// ─── Camera focus per part ────────────────────────────────────────────────────
// Returns local-space target + an outward camera offset. PCScene rotates both by
// the model's live rotationY so focusing tracks the (paused) part correctly.

export interface Focus { target: V3; offset: V3 }

// Exploded-view outward offsets — large enough that parts clearly leave the case.
export const EXPLODE_DIRS: Record<string, V3> = {
  motherboard: [0, 0, -0.35],
  cpu:         [0.25, 1.0, 0.5],
  cooling:     [0.25, 1.65, 0.6],
  ram:         [1.35, 0.6, 0.4],
  storage:     [0.7, -0.45, 1.25],
  gpu:         [-0.1, -0.95, 1.45],
  psu:         [-0.3, -1.45, 0.7],
}

export function getPartFocus(part: string, layout: PCLayout, explode = 0): Focus {
  const off: Record<string, V3> = {
    cpu:         [0.55, 0.45, 0.75],
    cooling:     [0.45, 0.55, 0.80],
    ram:         [0.65, 0.30, 0.75],
    motherboard: [0.40, 0.20, 1.05],
    gpu:         [0.25, -0.10, 0.95],
    storage:     [0.45, 0.05, 0.70],
    psu:         [0.35, -0.30, 0.95],
  }
  const targets: Record<string, V3> = {
    cpu: layout.cpu,
    cooling: [layout.cooler[0], layout.cooler[1] + 0.06, layout.cooler[2]],
    ram: layout.ram,
    motherboard: layout.mobo.pos,
    gpu: layout.gpu,
    storage: layout.storage,
    psu: layout.psu,
  }
  const base = targets[part] ?? [0, 0, 0]
  const ex = EXPLODE_DIRS[part] ?? [0, 0, 0]
  // shift the focus target to wherever the part actually is when exploded
  const target: V3 = [base[0] + ex[0] * explode, base[1] + ex[1] * explode, base[2] + ex[2] * explode]
  return { target, offset: off[part] ?? [0.5, 0.4, 1.0] }
}

export const HOME_VIEW = {
  pos: [2.2, 1.6, 2.6] as V3,
  target: [0, 0, 0] as V3,
}
