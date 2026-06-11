import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, AlertTriangle, CheckCircle2, Zap, DollarSign, Share2, Link2, FileDown, Save, FolderOpen, Check, X } from 'lucide-react'
import type { Build, PartCategory } from '../../types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../data/parts'
import { useT } from '../../lib/i18n'
import { PerformancePanel } from './PerformancePanel'
import {
  buildShareUrl, buildToCSV, downloadTextFile,
  savedBuildsGet, savedBuildAdd, savedBuildDelete, decodeBuild, type SavedBuild,
} from '../../lib/buildShare'

interface MyBuildPageProps {
  build: Build
  totalPrice: number
  totalTdp: number
  recommendedPsu: number
  onRemovePart: (category: PartCategory) => void
  onClear: () => void
  onLoadBuild?: (build: Build) => void
}

const SLOTS: PartCategory[] = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'cooling', 'case']

export function MyBuildPage({
  build,
  totalPrice,
  totalTdp,
  recommendedPsu,
  onRemovePart,
  onClear,
  onLoadBuild,
}: MyBuildPageProps) {
  const { t } = useT()
  const filled = SLOTS.filter(c => build[c])
  const psuWatts = parseInt(build.psu?.specs.wattage ?? '0')
  const psuOk = !build.psu || psuWatts >= recommendedPsu
  const complete = filled.length === 8

  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saved, setSaved] = useState<SavedBuild[]>(() => savedBuildsGet())

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 1800) }

  const shareLink = async () => {
    const url = buildShareUrl(build)
    try { await navigator.clipboard.writeText(url); flash('Share link copied') }
    catch { flash('Copy failed') }
  }

  const exportCsv = () => {
    downloadTextFile('pc-build.csv', buildToCSV(build), 'text/csv')
    flash('CSV downloaded')
  }

  const commitSave = () => {
    const entry = savedBuildAdd(saveName, build)
    setSaved([entry, ...saved])
    setSaving(false)
    setSaveName('')
    flash('Build saved')
  }

  const loadSaved = (b: SavedBuild) => {
    onLoadBuild?.(decodeBuild(b.code))
    flash(`Loaded "${b.name}"`)
  }

  const deleteSaved = (id: string) => {
    savedBuildDelete(id)
    setSaved(saved.filter(s => s.id !== id))
  }

  const copyBuild = () => {
    const lines = filled.map(c => `${CATEGORY_LABELS[c]}: ${build[c]!.fullName} ($${build[c]!.price})`)
    lines.push(`Total: $${totalPrice.toLocaleString()}`)
    navigator.clipboard.writeText(lines.join('\n'))
    flash('List copied')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Title + actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('mybuild.title')}</h1>
            <p className="text-white/40 text-sm mt-1">
              {t('mybuild.slotsFilled', { n: filled.length })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {filled.length > 0 && (
              <>
                <button onClick={shareLink}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
                    bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20 transition-all">
                  <Link2 className="w-4 h-4" /> {t('mybuild.shareLink')}
                </button>
                <button onClick={exportCsv}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
                    bg-white/[0.05] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
                  <FileDown className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setSaving(v => !v)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
                    bg-white/[0.05] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
                  <Save className="w-4 h-4" /> {t('mybuild.save')}
                </button>
                <button onClick={copyBuild}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
                    bg-white/[0.05] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
                  <Share2 className="w-4 h-4" /> {t('mybuild.copy')}
                </button>
                <button onClick={onClear}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
                    bg-red-900/15 border border-red-800/30 text-red-400/70 hover:text-red-400 hover:bg-red-900/30 transition-all">
                  <Trash2 className="w-4 h-4" /> {t('mybuild.clear')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Save name input */}
        <AnimatePresence>
          {saving && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="flex gap-2 p-3 rounded-2xl bg-surface2 border border-white/[0.08]">
                <input
                  autoFocus
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitSave() }}
                  placeholder="Build name (e.g. Gaming Rig)"
                  className="flex-1 bg-bg/60 border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white placeholder-white/25 focus:outline-none focus:border-accent/40"
                />
                <button onClick={commitSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                    bg-accent text-white hover:bg-accent/90 transition-all">
                  <Check className="w-4 h-4" /> Save
                </button>
                <button onClick={() => setSaving(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.05]
                    border border-white/10 text-white/40 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-surface2 rounded-2xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gold" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Total Cost</span>
            </div>
            <p className="text-2xl font-bold text-gold font-mono">
              ${totalPrice.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface2 rounded-2xl p-4 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Power Draw</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalTdp}W</p>
            <p className="text-xs text-white/30 mt-1">Min PSU: {recommendedPsu}W</p>
          </div>
          <div className={`rounded-2xl p-4 border ${
            complete && psuOk
              ? 'bg-green-900/10 border-green-800/20'
              : 'bg-surface2 border-white/[0.06]'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {complete && psuOk
                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                : <AlertTriangle className="w-4 h-4 text-yellow-400" />
              }
              <span className="text-xs text-white/40 uppercase tracking-wide">Status</span>
            </div>
            <p className={`text-sm font-bold ${complete && psuOk ? 'text-green-400' : 'text-yellow-400'}`}>
              {complete && psuOk ? 'Ready to Build' : `${8 - filled.length} slots empty`}
            </p>
          </div>
        </div>

        {/* PSU warning */}
        {!psuOk && totalTdp > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 mb-6 px-4 py-3 bg-yellow-900/15
              border border-yellow-800/30 rounded-2xl"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Insufficient Power Supply</p>
              <p className="text-xs text-yellow-400/60 mt-0.5">
                Your build requires ~{totalTdp}W TDP. Minimum recommended PSU: <strong>{recommendedPsu}W</strong>.
                {build.psu ? ` Your current PSU (${build.psu.specs.wattage}) may not be enough.` : ' Add a PSU to your build.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Build table */}
        <div className="bg-surface rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="grid grid-cols-[140px_1fr_auto_auto_auto] text-xs text-white/30
            uppercase tracking-wider px-5 py-3 border-b border-white/[0.05]">
            <span>Category</span>
            <span>Component</span>
            <span className="text-right">TDP</span>
            <span className="text-right">Price</span>
            <span />
          </div>

          {SLOTS.map((cat, i) => {
            const part = build[cat]
            const color = CATEGORY_COLORS[cat]

            return (
              <motion.div
                key={cat}
                layout
                className={`grid grid-cols-[140px_1fr_auto_auto_auto] items-center px-5 py-4
                  border-b border-white/[0.04] last:border-0 ${
                  part ? 'hover:bg-white/[0.02]' : 'opacity-50'
                } transition-colors group/row`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: part ? color : '#333' }}
                  />
                  <span className="text-xs text-white/50">{CATEGORY_LABELS[cat]}</span>
                </div>

                {part ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-white">{part.name}</p>
                      <p className="text-xs text-white/30">{part.brand}</p>
                    </div>
                    <span className="text-xs text-white/40 text-right pr-6 font-mono">
                      {part.tdp > 0 ? `${part.tdp}W` : '—'}
                    </span>
                    <span className="text-sm font-bold text-gold font-mono text-right pr-6">
                      ${part.price}
                    </span>
                    <button
                      onClick={() => onRemovePart(cat)}
                      className="opacity-0 group-hover/row:opacity-100 w-7 h-7 rounded-lg
                        flex items-center justify-center text-white/25 hover:text-red-400
                        hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-white/20 italic">Not selected</p>
                    <span />
                    <span />
                    <span />
                  </>
                )}
              </motion.div>
            )
          })}

          {/* Total row */}
          {filled.length > 0 && (
            <div className="grid grid-cols-[140px_1fr_auto_auto_auto] items-center px-5 py-4
              bg-surface2 border-t border-white/[0.08]">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider col-span-2">
                Total
              </span>
              <span className="text-xs font-bold text-white/60 text-right pr-6 font-mono">
                {totalTdp}W
              </span>
              <span className="text-base font-bold text-gold font-mono text-right pr-6">
                ${totalPrice.toLocaleString()}
              </span>
              <span />
            </div>
          )}
        </div>

        {filled.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/25 text-sm">Your build list is empty.</p>
            <p className="text-white/15 text-xs mt-2">
              Use the <span className="text-white/30">AI Chat</span> or{' '}
              <span className="text-white/30">Parts</span> tab to add components.
            </p>
          </div>
        )}

        {/* Performance estimate */}
        {filled.length > 0 && (
          <div className="mt-6">
            <PerformancePanel build={build} />
          </div>
        )}

        {/* Saved builds */}
        {saved.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-white/30" />
              <h2 className="text-sm font-bold text-white/70">Saved Builds</h2>
              <span className="text-xs text-white/25">({saved.length})</span>
            </div>
            <div className="space-y-2">
              {saved.map(b => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface2 border border-white/[0.06]
                    hover:border-white/[0.14] transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{b.name}</p>
                    <p className="text-xs text-white/35">
                      {b.count}/8 parts · <span className="text-gold font-mono">${b.price.toLocaleString()}</span>
                      {' · '}{new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => loadSaved(b)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                      bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20 transition-all">
                    <FolderOpen className="w-3.5 h-3.5" /> Load
                  </button>
                  <button onClick={() => deleteSaved(b.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25
                      hover:text-red-400 hover:bg-red-900/20 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
              px-4 py-2.5 rounded-xl bg-surface2 border border-white/15 shadow-2xl"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white/80">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
