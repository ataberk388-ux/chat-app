import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Box } from 'lucide-react'
import type { Build, PartCategory } from '../../types'
import { PARTS_BY_CATEGORY, CATEGORY_LABELS } from '../../data/parts'
import { PartCard } from './PartCard'
import { BuildSummary } from './BuildSummary'
import { PCScene } from '../3D/PCScene'

interface ConfiguratorPanelProps {
  build: Build
  totalPrice: number
  totalTdp: number
  recommendedPsu: number
  onAddPart: (part: import('../../types').Part) => void
  onRemovePart: (category: PartCategory) => void
  onClear: () => void
}

type Tab = '3d' | 'parts'

const CATEGORIES: PartCategory[] = ['cpu', 'gpu', 'ram', 'storage', 'motherboard', 'psu', 'case', 'cooling']

export function ConfiguratorPanel({
  build,
  totalPrice,
  totalTdp,
  recommendedPsu,
  onAddPart,
  onRemovePart,
  onClear,
}: ConfiguratorPanelProps) {
  const [tab, setTab] = useState<Tab>('3d')
  const [activeCategory, setActiveCategory] = useState<PartCategory>('cpu')

  return (
    <div className="flex flex-col h-full bg-surface border-l border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
        <h2 className="text-sm font-bold text-white flex-1">PC Configurator</h2>
        <div className="flex bg-surface2 rounded-lg p-0.5 gap-0.5">
          {([['3d', Box, '3D View'], ['parts', Layers, 'Parts']] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-all ${
                tab === id
                  ? 'bg-accent text-white shadow-[0_0_12px_rgba(200,16,46,0.4)]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {tab === '3d' ? (
            <motion.div
              key="3d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative"
            >
              <PCScene build={build} />

              {/* Overlay label */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <p className="text-xs text-white/20 font-mono">
                  Drag to rotate · Scroll to zoom
                </p>
              </div>

              {/* Installed parts overlay */}
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                {CATEGORIES.filter(c => build[c]).map(c => (
                  <motion.div
                    key={c}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg
                      bg-black/60 backdrop-blur-sm border border-white/10 text-xs"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: CATEGORY_LABELS[c] ? '#76FF7A' : '#888' }}
                    />
                    <span className="text-white/60">{CATEGORY_LABELS[c]}:</span>
                    <span className="text-white font-medium truncate max-w-[100px]">
                      {build[c]?.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="parts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              {/* Category tabs */}
              <div className="flex gap-1 px-3 py-2 overflow-x-auto flex-shrink-0 border-b border-white/[0.06]">
                {CATEGORIES.map(cat => {
                  const installed = !!build[cat]
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-all whitespace-nowrap ${
                        activeCategory === cat
                          ? 'bg-surface3 text-white border border-white/15'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {installed && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5" />
                      )}
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
              </div>

              {/* Parts grid */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-2">
                  {(PARTS_BY_CATEGORY[activeCategory] ?? []).map(part => (
                    <PartCard
                      key={part.id}
                      part={part}
                      isInstalled={build[part.category]?.id === part.id}
                      onAdd={onAddPart}
                      onRemove={p => onRemovePart(p.category)}
                      compact
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Build summary */}
      <BuildSummary
        build={build}
        totalPrice={totalPrice}
        totalTdp={totalTdp}
        recommendedPsu={recommendedPsu}
        onRemovePart={onRemovePart}
        onClear={onClear}
      />
    </div>
  )
}
