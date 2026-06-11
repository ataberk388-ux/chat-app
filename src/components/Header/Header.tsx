import { motion } from 'framer-motion'
import { MessageSquare, Box, Grid3X3, ListChecks, Cpu, Layers } from 'lucide-react'
import type { AppTab } from '../../types/tabs'
import { useT } from '../../lib/i18n'

interface HeaderProps {
  activeTab: AppTab | null
  onTabChange: (tab: AppTab) => void
  partCount: number
  totalPrice: number
  onLogoClick?: () => void
}

const TABS: { id: AppTab; icon: typeof Cpu }[] = [
  { id: 'chat',    icon: MessageSquare },
  { id: 'build',   icon: Box },
  { id: 'parts',   icon: Grid3X3 },
  { id: 'presets', icon: Layers },
  { id: 'mybuild', icon: ListChecks },
]

export function Header({ activeTab, onTabChange, partCount, totalPrice, onLogoClick }: HeaderProps) {
  const { lang, setLang, t } = useT()
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 h-14
        border-b border-white/[0.06]"
      style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(20px)' }}
    >
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2.5 mr-8 flex-shrink-0 group"
      >
        <div className="w-7 h-7 rounded-md bg-accent/20 border border-accent/40
          flex items-center justify-center group-hover:bg-accent/30 transition-colors">
          <Cpu className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/80
          group-hover:text-white transition-colors hidden sm:block">
          PC Builder<span className="text-accent">.</span>AI
        </span>
      </button>

      {/* Tabs */}
      <nav className="flex items-center gap-0.5">
        {TABS.map(({ id, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`relative flex items-center gap-1.5 px-3.5 h-14 text-sm font-medium
                transition-colors duration-150 whitespace-nowrap ${
                isActive
                  ? 'text-white'
                  : activeTab === null
                  ? 'text-white/30 hover:text-white/60'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden md:block">{t(`tab.${id}`)}</span>
              {id === 'mybuild' && partCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px]
                  font-bold flex items-center justify-center">
                  {partCount}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #C8102E, transparent)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* Right — language toggle + build stats */}
      <div className="ml-auto flex items-center gap-3">
        {/* Language toggle */}
        <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5">
          {(['tr', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                lang === l ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {partCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-white/30 hidden sm:block">
              <span className="text-white/60">{partCount}</span>/8
            </span>
            <div className="px-3 py-1 rounded-lg bg-gold/10 border border-gold/25">
              <span className="text-gold font-bold font-mono text-sm">
                ${totalPrice.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
}
