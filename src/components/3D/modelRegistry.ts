// ─── GLTF model registry ──────────────────────────────────────────────────────
// Drop real .glb/.gltf files into  public/models/  and register them here.
// When a path is registered the 3D scene loads it; otherwise it renders the
// high-detail procedural fallback automatically. See public/models/README.md.
//
// Lookup priority:  exact part id  →  category default.
//
// Each entry can carry a transform so an imported model (which may be modeled at
// any scale/orientation) snaps into the procedural layout slot.

export interface ModelEntry {
  path: string
  scale?: number
  /** Euler rotation in radians applied after import. */
  rotation?: [number, number, number]
  /** Local position nudge applied after import. */
  offset?: [number, number, number]
}

// By part id (most specific). Example (commented — add your own files):
const BY_PART_ID: Record<string, ModelEntry> = {
  // 'rtx-5090':           { path: '/models/gpu-rtx5090.glb', scale: 1, rotation: [0, Math.PI, 0] },
  // 'intel-ultra9-285k':  { path: '/models/cpu-intel.glb',   scale: 1 },
}

// By category (generic fallback before procedural).
const BY_CATEGORY: Record<string, ModelEntry> = {
  // gpu:     { path: '/models/gpu-generic.glb', scale: 1 },
  // cpu:     { path: '/models/cpu-generic.glb', scale: 1 },
  // case:    { path: '/models/case-generic.glb', scale: 1 },
}

export function getModelEntry(category: string, partId?: string): ModelEntry | null {
  if (partId && BY_PART_ID[partId]) return BY_PART_ID[partId]
  if (BY_CATEGORY[category]) return BY_CATEGORY[category]
  return null
}

export function hasAnyModels(): boolean {
  return Object.keys(BY_PART_ID).length > 0 || Object.keys(BY_CATEGORY).length > 0
}
