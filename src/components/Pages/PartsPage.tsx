import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import type { Build, Part, PartCategory } from '../../types'
import { PARTS, CATEGORY_LABELS, CATEGORY_COLORS } from '../../data/parts'
import { PartCard } from '../Configurator/PartCard'

interface PartsPageProps {
  build: Build
  onAddPart: (part: Part) => void
  onRemovePart: (category: PartCategory) => void
}

const ALL_CATS: PartCategory[] = ['cpu', 'gpu', 'ram', 'storage', 'motherboard', 'psu', 'case', 'cooling']
const TIER_FILTERS = ['all', 'budget', 'mid', 'high-end', 'enthusiast'] as const

export function PartsPage({ build, onAddPart, onRemovePart }: PartsPageProps) {
  const [activeCategory, setActiveCategory] = useState<PartCategory | 'all'>('all')
  const [activeTier, setActiveTier] = useState<typeof TIER_FILTERS[number]>('all')
  const [search, setSearch] = useState('')

  const filtered = PARTS.filter(p => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false
    if (activeTier !== 'all' && p.tier !== activeTier) return false
    if (search) {
      const q = search.toLowerCase()
      return p.fullName.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] space-y-3">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search parts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface2 border border-white/[0.07]
              text-sm text-white placeholder:text-white/25 outline-none
              focus:border-white/20 transition-colors"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            }`}
          >
            All Categories
          </button>
          {ALL_CATS.map(cat => {
            const installed = !!build[cat]
            const color = CATEGORY_COLORS[cat]
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all border ${
                  isActive
                    ? 'text-white border-white/20 bg-white/8'
                    : 'text-white/40 hover:text-white/70 border-transparent'
                }`}
              >
                {installed && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                )}
                {CATEGORY_LABELS[cat]}
              </button>
            )
          })}
        </div>

        {/* Tier filter */}
        <div className="flex gap-2">
          {TIER_FILTERS.map(tier => (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeTier === tier
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-white/30 hover:text-white/60 border border-transparent'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : tier.charAt(0).toUpperCase() + tier.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex-shrink-0 px-6 py-2">
        <p className="text-xs text-white/25">
          {filtered.length} part{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${activeTier}-${search}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          >
            {filtered.map((part, i) => (
              <motion.div
                key={part.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
              >
                <PartCard
                  part={part}
                  isInstalled={build[part.category]?.id === part.id}
                  onAdd={onAddPart}
                  onRemove={p => onRemovePart(p.category)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <p className="text-white/25 text-sm">No parts found</p>
          </div>
        )}
      </div>
    </div>
  )
}
