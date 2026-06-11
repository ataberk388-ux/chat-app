import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, DollarSign, ChevronRight, CheckCircle2, X, Layers } from 'lucide-react'
import type { Build } from '../../types'
import { PRESETS, presetTotalPrice, buildFromPreset, type Preset } from '../../data/presets'
import { CATEGORY_LABELS, PARTS } from '../../data/parts'

interface PresetsPageProps {
  currentBuild: Build
  onLoadPreset: (build: Build) => void
  onGoToBuild: () => void
}

const TIER_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  budget:     { label: 'Budget',     bg: 'bg-green-900/20',  text: 'text-green-400',  border: 'border-green-800/40' },
  mid:        { label: 'Mid-Range',  bg: 'bg-blue-900/20',   text: 'text-blue-400',   border: 'border-blue-800/40' },
  'high-end': { label: 'High-End',   bg: 'bg-gold/10',       text: 'text-gold',       border: 'border-gold/30' },
  enthusiast: { label: 'Enthusiast', bg: 'bg-accent/10',     text: 'text-accent',     border: 'border-accent/30' },
}

function PresetCard({
  preset,
  isLoaded,
  onLoad,
  onPreview,
}: {
  preset: Preset
  isLoaded: boolean
  onLoad: () => void
  onPreview: () => void
}) {
  const price = presetTotalPrice(preset)
  const tier = TIER_STYLES[preset.tier]
  const [hovered, setHovered] = useState(false)

  const partEntries = Object.entries(preset.partIds).map(([cat, id]) => ({
    cat,
    part: PARTS.find(p => p.id === id),
  }))

  return (
    <motion.div
      layout
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: 'rgba(14,14,14,0.95)',
        border: `1px solid ${hovered ? preset.accentColor + '40' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered ? `0 0 40px ${preset.accentColor}15` : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-[2px] w-full"
        style={{
          background: hovered
            ? `linear-gradient(90deg, transparent, ${preset.accentColor}, transparent)`
            : 'transparent',
          transition: 'background 0.3s',
        }}
      />

      {/* Loaded indicator */}
      {isLoaded && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full
            bg-green-900/30 border border-green-700/40">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400 font-medium">Loaded</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start gap-3 mb-2">
            <div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px]
                font-semibold uppercase tracking-wider border mb-2 ${tier.bg} ${tier.text} ${tier.border}`}>
                {tier.label}
              </div>
              <h3 className="text-lg font-black text-white tracking-tight leading-tight">
                {preset.name}
              </h3>
              <p className="text-xs text-white/40 mt-0.5">{preset.tagline}</p>
            </div>
          </div>

          <div className="text-xs font-medium px-2 py-1 rounded-lg inline-block"
            style={{
              background: `${preset.accentColor}10`,
              border: `1px solid ${preset.accentColor}25`,
              color: preset.accentColor,
            }}
          >
            {preset.useCase}
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {preset.highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs text-white/60 px-2 py-1.5
                bg-white/[0.03] rounded-lg border border-white/[0.04]"
            >
              <div className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: preset.accentColor }} />
              {h}
            </div>
          ))}
        </div>

        {/* Parts list */}
        <div className="space-y-1.5 mb-5">
          {partEntries.map(({ cat, part }) => (
            part && (
              <div key={cat} className="flex items-center gap-2 py-1">
                <span className="text-[10px] text-white/25 w-20 flex-shrink-0 uppercase tracking-wide">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-xs text-white/70 flex-1 truncate font-medium">
                  {part.name}
                </span>
                <span className="text-[11px] text-gold font-mono flex-shrink-0">
                  ${part.price}
                </span>
              </div>
            )
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
          <div className="flex-1">
            <p className="text-[10px] text-white/30 mb-0.5 uppercase tracking-wide">Total</p>
            <p className="text-xl font-black text-gold font-mono">${price.toLocaleString()}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onPreview}
              className="px-3 py-2 rounded-xl text-xs font-semibold
                bg-white/[0.05] border border-white/10 text-white/60
                hover:text-white hover:bg-white/[0.09] transition-all"
            >
              Preview
            </button>
            <motion.button
              onClick={onLoad}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                text-white transition-all"
              style={{
                background: `linear-gradient(135deg, ${preset.accentColor}, ${preset.accentColor}99)`,
                boxShadow: `0 0 20px ${preset.accentColor}30`,
              }}
            >
              Load Build
              <ChevronRight className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PreviewModal({ preset, onClose, onLoad }: {
  preset: Preset
  onClose: () => void
  onLoad: () => void
}) {
  const price = presetTotalPrice(preset)
  const partEntries = Object.entries(preset.partIds).map(([cat, id]) => ({
    cat,
    part: PARTS.find(p => p.id === id),
  }))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: '#0e0e0e',
          border: `1px solid ${preset.accentColor}40`,
          boxShadow: `0 0 60px ${preset.accentColor}20`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${preset.accentColor}, transparent)` }}
        />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-white">{preset.name}</h2>
              <p className="text-sm text-white/40 mt-1">{preset.tagline}</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center
                justify-center text-white/50 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 mb-6">
            {partEntries.map(({ cat, part }) => (
              part && (
                <div key={cat}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface2 border border-white/[0.05]">
                  <span className="text-xs text-white/40 w-24 flex-shrink-0 uppercase tracking-wide">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{part.fullName}</p>
                    <p className="text-xs text-white/35">{part.brand} · {part.tier}</p>
                  </div>
                  <span className="text-sm font-bold text-gold font-mono flex-shrink-0">
                    ${part.price}
                  </span>
                </div>
              )
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            <div>
              <p className="text-xs text-white/30 mb-1">Total Build Cost</p>
              <p className="text-2xl font-black text-gold font-mono">${price.toLocaleString()}</p>
            </div>
            <motion.button
              onClick={() => { onLoad(); onClose() }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white"
              style={{
                background: `linear-gradient(135deg, ${preset.accentColor}, ${preset.accentColor}99)`,
                boxShadow: `0 0 24px ${preset.accentColor}40`,
              }}
            >
              <Zap className="w-4 h-4" />
              Load This Build
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function PresetsPage({ currentBuild, onLoadPreset, onGoToBuild }: PresetsPageProps) {
  const [previewPreset, setPreviewPreset] = useState<Preset | null>(null)

  const isPresetLoaded = (preset: Preset) => {
    const entries = Object.entries(preset.partIds)
    return entries.every(([cat, id]) =>
      (currentBuild as Record<string, { id: string } | undefined>)[cat]?.id === id
    )
  }

  const handleLoad = (preset: Preset) => {
    onLoadPreset(buildFromPreset(preset))
    onGoToBuild()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-[1px] w-8 bg-accent" />
            <span className="text-xs text-accent font-mono uppercase tracking-widest">
              Expert Configured
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Preset Builds</h1>
          <p className="text-white/40 text-sm max-w-md">
            Hand-picked component combinations for every use case and budget.
            Load a preset and customize it further with AI Chat.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Builds', value: PRESETS.length.toString(), icon: Layers },
            { label: 'Budget from', value: `$${Math.min(...PRESETS.map(presetTotalPrice)).toLocaleString()}`, icon: DollarSign },
            { label: 'Max Performance', value: 'RTX 5090', icon: Zap },
            { label: 'Configurations', value: '5 use cases', icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label}
              className="bg-surface2 rounded-xl px-4 py-3 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[10px] text-white/30 uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESETS.map((preset, i) => (
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <PresetCard
                preset={preset}
                isLoaded={isPresetLoaded(preset)}
                onLoad={() => handleLoad(preset)}
                onPreview={() => setPreviewPreset(preset)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewPreset && (
          <PreviewModal
            preset={previewPreset}
            onClose={() => setPreviewPreset(null)}
            onLoad={() => handleLoad(previewPreset)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

