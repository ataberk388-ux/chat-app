import type { Build, PartCategory } from '../types'
import { PARTS, CATEGORY_LABELS } from '../data/parts'

const ORDER: PartCategory[] = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'cooling', 'case']

// ─── Compact encode / decode (for shareable URLs) ─────────────────────────────
// Format:  cat.partId~cat.partId  (part ids contain only [a-z0-9-])

export function encodeBuild(build: Build): string {
  return ORDER
    .filter(cat => build[cat])
    .map(cat => `${cat}.${build[cat]!.id}`)
    .join('~')
}

export function decodeBuild(code: string): Build {
  const out: Build = {}
  for (const token of code.split('~')) {
    const dot = token.indexOf('.')
    if (dot < 0) continue
    const cat = token.slice(0, dot) as PartCategory
    const id = token.slice(dot + 1)
    const part = PARTS.find(p => p.id === id && p.category === cat)
    if (part) (out as Record<string, typeof part>)[cat] = part
  }
  return out
}

export function buildShareUrl(build: Build): string {
  const code = encodeBuild(build)
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  return `${base}?build=${encodeURIComponent(code)}`
}

export function readBuildFromUrl(): Build | null {
  if (typeof window === 'undefined') return null
  const code = new URLSearchParams(window.location.search).get('build')
  if (!code) return null
  const build = decodeBuild(decodeURIComponent(code))
  return Object.keys(build).length ? build : null
}

export function clearBuildUrlParam(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('build')
  window.history.replaceState({}, '', url.toString())
}

// ─── CSV export (bill of materials) ───────────────────────────────────────────

export function buildToCSV(build: Build): string {
  const rows = [['Category', 'Brand', 'Component', 'Tier', 'TDP (W)', 'Price (USD)']]
  let total = 0
  for (const cat of ORDER) {
    const p = build[cat]
    if (!p) continue
    total += p.price
    rows.push([CATEGORY_LABELS[cat] ?? cat, p.brand, p.fullName, p.tier, String(p.tdp), String(p.price)])
  }
  rows.push(['', '', '', '', 'TOTAL', String(total)])
  return rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Saved builds (named, in localStorage) ────────────────────────────────────

export interface SavedBuild {
  id: string
  name: string
  code: string
  price: number
  count: number
  createdAt: number
}

const SAVED_KEY = 'pcbuilder-saved-builds'

export function savedBuildsGet(): SavedBuild[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') }
  catch { return [] }
}

function savedBuildsSet(list: SavedBuild[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list))
}

export function savedBuildAdd(name: string, build: Build): SavedBuild {
  const entry: SavedBuild = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Untitled Build',
    code: encodeBuild(build),
    price: Object.values(build).reduce((s, p) => s + (p?.price ?? 0), 0),
    count: Object.values(build).filter(Boolean).length,
    createdAt: Date.now(),
  }
  savedBuildsSet([entry, ...savedBuildsGet()])
  return entry
}

export function savedBuildDelete(id: string): void {
  savedBuildsSet(savedBuildsGet().filter(b => b.id !== id))
}
