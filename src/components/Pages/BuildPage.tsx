import { useState, useCallback, useMemo, useRef } from 'react'
import { PCScene } from '../3D/PCScene'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Zap, DollarSign, AlertTriangle, CheckCircle2, RotateCcw, Check, Plus, XCircle, Maximize2, Minimize2, Camera, Palette } from 'lucide-react'
import type { Build, Part, PartCategory } from '../../types'
import { CATEGORY_COLORS, PARTS_BY_CATEGORY } from '../../data/parts'
import { checkCompatibility, compatSummary } from '../../lib/compatibility'
import { useT } from '../../lib/i18n'
import { rgbState, RGB_SWATCHES } from '../3D/rgbState'

interface BuildPageProps {
  build: Build
  totalPrice: number
  totalTdp: number
  recommendedPsu: number
  onAddPart: (part: Part) => void
  onRemovePart: (category: PartCategory) => void
  onClear: () => void
}

const ALL_SLOTS: PartCategory[] = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'cooling', 'case']

// ─── Inline part picker (swap from the panel) ─────────────────────────────────

function SlotPicker({
  category, current, onPick,
}: {
  category: PartCategory
  current?: Part
  onPick: (p: Part) => void
}) {
  const { t } = useT()
  const options = PARTS_BY_CATEGORY[category] ?? []
  const color = CATEGORY_COLORS[category]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-1 mb-1 p-2 rounded-xl bg-bg/60 border border-white/[0.08] space-y-1
        max-h-64 overflow-y-auto">
        <p className="text-[10px] text-white/30 uppercase tracking-wide px-1 py-1">
          {t('build.swap')} {t(`cat.${category}`)}
        </p>
        {options.map(opt => {
          const isCurrent = current?.id === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onPick(opt)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                isCurrent
                  ? 'bg-white/[0.07] border border-white/15'
                  : 'border border-transparent hover:bg-white/[0.04]'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isCurrent ? color : 'rgba(255,255,255,0.2)' }} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isCurrent ? 'text-white' : 'text-white/70'}`}>
                  {opt.name}
                </p>
                <p className="text-[10px] text-white/30">{opt.brand} · {opt.tier}</p>
              </div>
              <span className="text-[11px] text-gold font-mono flex-shrink-0">${opt.price}</span>
              {isCurrent
                ? <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                : <Plus className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

export function BuildPage({
  build, totalPrice, totalTdp, recommendedPsu, onAddPart, onRemovePart, onClear,
}: BuildPageProps) {
  const { t } = useT()
  const [selectedPart, setSelectedPart] = useState<PartCategory | null>(null)
  const [exploded, setExploded] = useState(false)
  const [rgbId, setRgbId] = useState('rainbow')
  const [showRgb, setShowRgb] = useState(false)
  const captureRef = useRef<(() => string) | null>(null)

  const filledSlots = ALL_SLOTS.filter(c => build[c])

  const pickRgb = useCallback((id: string, color: string) => {
    setRgbId(id)
    if (id === 'rainbow') rgbState.mode = 'rainbow'
    else { rgbState.mode = 'solid'; rgbState.color = color }
  }, [])

  const takeScreenshot = useCallback(() => {
    const url = captureRef.current?.()
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `pc-build-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const issues = useMemo(() => checkCompatibility(build, recommendedPsu), [build, recommendedPsu])
  const summary = compatSummary(issues)
  const blockingIssues = issues.filter(i => i.level !== 'ok')

  const handleSelectPart = useCallback((cat: PartCategory | null) => setSelectedPart(cat), [])

  const handleSlotClick = useCallback((cat: PartCategory) => {
    setSelectedPart(prev => prev === cat ? null : cat)
  }, [])

  const handleRemovePart = useCallback((cat: PartCategory) => {
    onRemovePart(cat)
  }, [onRemovePart])

  const handlePick = useCallback((part: Part) => {
    onAddPart(part)
  }, [onAddPart])

  return (
    <div className="flex h-full">
      {/* 3D scene */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: 'radial-gradient(circle at 50% 38%, #0e0d18 0%, #08080e 52%, #040406 100%)' }}
      >
        {/* slow drifting aurora glows behind the starfield (DOM — zero 3D risk) */}
        <motion.div
          aria-hidden
          animate={{ x: [0, 45, 0], y: [0, -25, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[12%] left-[18%] w-[26rem] h-[26rem] rounded-full pointer-events-none"
          style={{ background: '#C8102E', filter: 'blur(150px)', opacity: 0.13 }}
        />
        <motion.div
          aria-hidden
          animate={{ x: [0, -35, 0], y: [0, 30, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[8%] right-[14%] w-[30rem] h-[30rem] rounded-full pointer-events-none"
          style={{ background: '#3a4cff', filter: 'blur(165px)', opacity: 0.11 }}
        />
        <motion.div
          aria-hidden
          animate={{ opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[42%] left-1/2 -translate-x-1/2 w-[32rem] h-[20rem] rounded-full pointer-events-none"
          style={{ background: '#C9A84C', filter: 'blur(175px)' }}
        />

        <PCScene
          build={build}
          selectedPart={selectedPart}
          onSelectPart={handleSelectPart}
          onRemovePart={handleRemovePart}
          explode={exploded ? 1 : 0}
          captureRef={captureRef}
        />

        <div className="absolute top-4 left-4 pointer-events-none">
          <p className="text-xs text-white/20 font-mono">{t('build.hint')}</p>
        </div>

        {/* Top-right control cluster */}
        {filledSlots.length > 0 && (
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {/* RGB */}
              <button
                onClick={() => setShowRgb(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  showRgb ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-black/50 border-white/[0.1] text-white/60 hover:text-white hover:border-white/25'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                {t('rgb.title')}
              </button>
              {/* Screenshot */}
              <button
                onClick={takeScreenshot}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                  bg-black/50 border border-white/[0.1] text-white/60 hover:text-white hover:border-white/25 transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                {t('shot.capture')}
              </button>
              {/* Exploded */}
              <motion.button
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setExploded(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  exploded ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-black/50 border-white/[0.1] text-white/60 hover:text-white hover:border-white/25'
                }`}
              >
                {exploded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {exploded ? t('build.assemble') : t('build.exploded')}
              </motion.button>
            </div>

            {/* RGB swatches */}
            <AnimatePresence>
              {showRgb && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-black/60 border border-white/[0.1]"
                >
                  {RGB_SWATCHES.map(sw => (
                    <button
                      key={sw.id}
                      onClick={() => pickRgb(sw.id, sw.color)}
                      title={sw.id === 'rainbow' ? t('rgb.rainbow') : sw.id}
                      className={`w-6 h-6 rounded-lg border-2 transition-all ${rgbId === sw.id ? 'border-white scale-110' : 'border-white/20 hover:border-white/50'}`}
                      style={{
                        background: sw.id === 'rainbow'
                          ? 'conic-gradient(from 0deg, #ff1a3c, #C9A84C, #19e36b, #19c8ff, #2a5cff, #a855f7, #ff1a3c)'
                          : sw.color,
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {filledSlots.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <p className="text-white/20 text-sm">No parts installed</p>
              <p className="text-white/10 text-xs mt-1">Click a slot at right or use Parts / Presets</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-surface border-l border-white/[0.06] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <h2 className="text-sm font-bold text-white">{t('build.componentList')}</h2>
          {filledSlots.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-white/25 hover:text-red-400 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {t('build.reset')}
            </button>
          )}
        </div>

        <div className="flex-1 px-4 py-3 space-y-1.5">
          {ALL_SLOTS.map(cat => {
            const part = build[cat]
            const color = CATEGORY_COLORS[cat]
            const isSelected = selectedPart === cat

            return (
              <div key={cat}>
                <motion.div
                  layout
                  onClick={() => handleSlotClick(cat)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${isSelected
                      ? 'bg-surface2 shadow-[0_0_16px_rgba(200,16,46,0.12)]'
                      : part
                      ? 'bg-surface2 border-white/[0.08] hover:border-white/[0.18]'
                      : 'bg-transparent border-dashed border-white/[0.08] hover:border-white/[0.18]'
                    }`}
                  style={isSelected ? { borderColor: `${color}55` } : undefined}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                      part ? '' : 'opacity-25'
                    } ${isSelected ? 'scale-125' : ''}`}
                    style={{ background: color }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${
                      part ? (isSelected ? 'text-white/60' : 'text-white/40') : 'text-white/25'
                    }`}>
                      {t(`cat.${cat}`)}
                    </p>
                    {part ? (
                      <>
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                          {part.name}
                        </p>
                        <p className="text-xs text-gold font-mono">${part.price}</p>
                      </>
                    ) : (
                      <p className="text-xs text-white/25 italic">{t('build.clickToAdd')}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {part ? (
                      <button
                        onClick={e => { e.stopPropagation(); handleRemovePart(cat) }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center
                          text-white/20 hover:text-red-400 hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : (
                      <div className="w-6 h-6 rounded-lg border border-dashed border-white/12
                        flex items-center justify-center">
                        <Plus className="w-3 h-3 text-white/25" />
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Inline picker */}
                <AnimatePresence>
                  {isSelected && (
                    <SlotPicker category={cat} current={part} onPick={handlePick} />
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* Stats */}
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/[0.06] flex-shrink-0">
          {/* Compatibility engine */}
          {filledSlots.length >= 2 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-white/30 uppercase tracking-wide">{t('build.compatibility')}</span>
                <div className="flex items-center gap-2 ml-auto text-[10px]">
                  {summary.errors > 0 && <span className="text-red-400">{summary.errors} error</span>}
                  {summary.warnings > 0 && <span className="text-yellow-400">{summary.warnings} warn</span>}
                  {summary.errors === 0 && summary.warnings === 0 && (
                    <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('build.allGood')}</span>
                  )}
                </div>
              </div>

              {blockingIssues.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/10 border border-green-800/20 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  <p className="text-xs text-green-400/80">{t('build.noConflicts')}</p>
                </div>
              ) : (
                blockingIssues.map((iss, i) => {
                  const isErr = iss.level === 'error'
                  return (
                    <div key={i}
                      className={`flex items-start gap-2 px-3 py-2 rounded-xl border ${
                        isErr ? 'bg-red-900/15 border-red-800/30' : 'bg-yellow-900/12 border-yellow-800/30'
                      }`}>
                      {isErr
                        ? <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${isErr ? 'text-red-400' : 'text-yellow-400'}`}>{iss.title}</p>
                        <p className={`text-[11px] mt-0.5 leading-snug ${isErr ? 'text-red-400/60' : 'text-yellow-400/60'}`}>{iss.detail}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface2 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[10px] text-white/30 uppercase tracking-wide">TDP</span>
              </div>
              <p className="text-sm font-bold text-white">{totalTdp}W</p>
              {totalTdp > 0 && <p className="text-[10px] text-white/25 mt-0.5">PSU: {recommendedPsu}W+</p>}
            </div>
            <div className="bg-surface2 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-gold" />
                <span className="text-[10px] text-white/30 uppercase tracking-wide">Total</span>
              </div>
              <p className="text-sm font-bold text-gold font-mono">${totalPrice.toLocaleString()}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{filledSlots.length}/8 slots</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-white/25">
              <span>{t('build.completion')}</span>
              <span>{Math.round((filledSlots.length / 8) * 100)}%</span>
            </div>
            <div className="h-1 bg-surface2 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #C8102E, #C9A84C)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(filledSlots.length / 8) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
