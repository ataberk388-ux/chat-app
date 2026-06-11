import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Zap, DollarSign, AlertTriangle } from 'lucide-react'
import type { Build, PartCategory } from '../../types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../data/parts'

interface BuildSummaryProps {
  build: Build
  totalPrice: number
  totalTdp: number
  recommendedPsu: number
  onRemovePart: (category: PartCategory) => void
  onClear: () => void
}

export function BuildSummary({
  build,
  totalPrice,
  totalTdp,
  recommendedPsu,
  onRemovePart,
  onClear,
}: BuildSummaryProps) {
  const parts = Object.entries(build).filter(([, v]) => v) as [PartCategory, NonNullable<Build[PartCategory]>][]
  const psuOk = !build.psu || build.psu.specs.wattage
    ? parseInt(build.psu?.specs.wattage ?? '0') >= recommendedPsu
    : true

  if (parts.length === 0) {
    return (
      <div className="p-4 border-t border-white/[0.06]">
        <div className="text-center py-4">
          <p className="text-white/25 text-xs">Your build is empty</p>
          <p className="text-white/15 text-xs mt-1">Ask the AI for recommendations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-t border-white/[0.06]">
      {/* Parts list */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Current Build</span>
          <button
            onClick={onClear}
            className="text-xs text-white/25 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>

        <AnimatePresence>
          {parts.map(([category, part]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2 py-1.5 group/item"
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: CATEGORY_COLORS[category] }}
              />
              <span className="text-xs text-white/40 w-20 flex-shrink-0 truncate">
                {CATEGORY_LABELS[category]}
              </span>
              <span className="text-xs text-white/80 flex-1 truncate font-medium">
                {part.name}
              </span>
              <span className="text-xs text-gold font-mono flex-shrink-0">${part.price}</span>
              <button
                onClick={() => onRemovePart(category)}
                className="opacity-0 group-hover/item:opacity-100 text-white/25
                  hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div className="px-3 pb-3 space-y-2">
        {!psuOk && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 border
            border-yellow-800/40 rounded-lg text-yellow-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>PSU may be underpowered (need {recommendedPsu}W+)</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-surface2 rounded-lg px-3 py-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-wide">Power</p>
              <p className="text-xs font-bold text-white">{totalTdp}W</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-surface2 rounded-lg px-3 py-2">
            <DollarSign className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-wide">Total</p>
              <p className="text-xs font-bold text-gold font-mono">${totalPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
