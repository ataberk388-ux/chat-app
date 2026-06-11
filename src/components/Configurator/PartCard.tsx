import { motion } from 'framer-motion'
import { X, CheckCircle } from 'lucide-react'
import type { Part } from '../../types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../data/parts'

interface PartCardProps {
  part: Part
  isInstalled?: boolean
  onAdd: (part: Part) => void
  onRemove: (part: Part) => void
  compact?: boolean
}

const TIER_BADGE: Record<string, { label: string; class: string }> = {
  budget: { label: 'Budget', class: 'text-white/40 bg-white/5 border-white/10' },
  mid: { label: 'Mid', class: 'text-blue-400 bg-blue-900/20 border-blue-800/40' },
  'high-end': { label: 'High-End', class: 'text-gold bg-gold/10 border-gold/30' },
  enthusiast: { label: 'Enthusiast', class: 'text-accent bg-accent/10 border-accent/30' },
}

export function PartCard({ part, isInstalled, onAdd, onRemove, compact }: PartCardProps) {
  const color = CATEGORY_COLORS[part.category]
  const tier = TIER_BADGE[part.tier]

  return (
    <motion.div
      layout
      className={`group relative rounded-xl border transition-all duration-200 overflow-hidden ${
        isInstalled
          ? 'border-white/20 bg-surface2'
          : 'border-white/[0.06] bg-surface hover:border-white/15 hover:bg-surface2'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: isInstalled ? color : 'transparent', transition: 'background 0.3s' }}
      />

      {compact ? (
        <div className="flex items-center gap-3">
          {/* Image */}
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-surface3
              flex items-center justify-center"
          >
            <img
              src={part.image}
              alt={part.name}
              className="w-full h-full object-cover opacity-80"
              loading="lazy"
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
              >
                {CATEGORY_LABELS[part.category]}
              </span>
            </div>
            <p className="text-xs font-medium text-white truncate">{part.name}</p>
            <p className="text-xs text-white/40 font-mono">${part.price}</p>
          </div>

          {/* Action */}
          {isInstalled ? (
            <button
              onClick={() => onRemove(part)}
              className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center
                text-white/30 hover:text-red-400 hover:bg-red-900/20 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={() => onAdd(part)}
              className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium
                bg-white/5 hover:bg-accent/20 text-white/50 hover:text-accent
                border border-white/10 hover:border-accent/30 transition-all"
            >
              Add
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Full card */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface3 flex-shrink-0
              flex items-center justify-center">
              <img
                src={part.image}
                alt={part.name}
                className="w-full h-full object-cover opacity-80"
                loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                >
                  {CATEGORY_LABELS[part.category]}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${tier.class}`}>
                  {tier.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{part.name}</p>
              <p className="text-xs text-white/40">{part.brand}</p>
            </div>
            <p className="text-sm font-bold text-gold font-mono flex-shrink-0">${part.price}</p>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {Object.entries(part.specs).slice(0, 4).map(([k, v]) => (
              <div key={k} className="bg-surface3/50 rounded-lg px-2 py-1.5">
                <p className="text-[9px] text-white/30 uppercase tracking-wide mb-0.5">{k}</p>
                <p className="text-xs text-white/80 font-medium truncate">{v}</p>
              </div>
            ))}
          </div>

          {/* Action */}
          {isInstalled ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>In your build</span>
              </div>
              <button
                onClick={() => onRemove(part)}
                className="text-xs px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400
                  hover:bg-red-900/20 border border-transparent hover:border-red-800/40
                  transition-all font-medium"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(part)}
              className="w-full text-sm py-2 rounded-lg font-semibold transition-all
                bg-white/[0.04] hover:bg-accent/15 text-white/60 hover:text-white
                border border-white/[0.08] hover:border-accent/30"
            >
              Add to Build
            </button>
          )}
        </>
      )}
    </motion.div>
  )
}
