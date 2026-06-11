import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gauge, Activity, Cpu, Zap } from 'lucide-react'
import type { Build } from '../../types'
import { CATEGORY_COLORS } from '../../data/parts'
import { useT } from '../../lib/i18n'
import {
  estimateFps, getBottleneck, powerBreakdown,
  RES_LABEL, type Resolution,
} from '../../lib/performance'

const RESOLUTIONS: Resolution[] = ['1080p', '1440p', '4k']

function fpsColor(fps: number): string {
  if (fps >= 100) return '#19e36b'
  if (fps >= 60) return '#C9A84C'
  return '#ff5a3c'
}

export function PerformancePanel({ build }: { build: Build }) {
  const { t } = useT()
  const [res, setRes] = useState<Resolution>('1440p')

  const catLabels: Record<string, string> = {
    cpu: t('cat.cpu'), gpu: t('cat.gpu'), motherboard: t('cat.motherboard'),
    ram: t('cat.ram'), storage: t('cat.storage'), cooling: t('cat.cooling'),
  }
  const fps = estimateFps(build, res)
  const bottleneck = getBottleneck(build)
  const power = powerBreakdown(build, catLabels, CATEGORY_COLORS)

  if (!fps) {
    return (
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 text-center">
        <Gauge className="w-6 h-6 text-white/15 mx-auto mb-2" />
        <p className="text-sm text-white/30">{t('perf.needCpuGpu')}</p>
      </div>
    )
  }

  const maxFps = Math.max(...fps.map(f => f.fps), 1)

  return (
    <div className="bg-surface rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
        <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
          <Gauge className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white">{t('perf.title')}</h2>
          <p className="text-xs text-white/35">{t('perf.subtitle')}</p>
        </div>
        {/* resolution toggle */}
        <div className="flex gap-1 p-1 rounded-lg bg-bg/60 border border-white/[0.06]">
          {RESOLUTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRes(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                res === r ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {RES_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* FPS bars */}
        <div className="space-y-2.5">
          {fps.map(({ game, fps: f, limitedBy }) => (
            <div key={game.id} className="flex items-center gap-3">
              <span className="text-xs text-white/55 w-28 flex-shrink-0 truncate">{game.name}</span>
              <div className="flex-1 h-2 rounded-full bg-surface2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: fpsColor(f) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(f / maxFps) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-bold font-mono w-16 text-right" style={{ color: fpsColor(f) }}>
                {f} fps
              </span>
              <span className="text-[9px] text-white/25 w-8 uppercase">{limitedBy}</span>
            </div>
          ))}
        </div>

        {/* Bottleneck */}
        {bottleneck && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface2 border border-white/[0.05]">
            <Activity className="w-4 h-4 text-accent flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-white/30 uppercase tracking-wide">{t('perf.bottleneck')}</p>
              <p className="text-sm font-semibold text-white">
                {bottleneck.limiter === 'balanced'
                  ? t('perf.balanced')
                  : bottleneck.limiter === 'cpu'
                  ? t('perf.cpuLimited', { n: bottleneck.pct })
                  : t('perf.gpuLimited', { n: bottleneck.pct })}
              </p>
            </div>
            {/* CPU vs GPU balance bar */}
            <div className="flex items-center gap-1.5 text-[9px] text-white/40">
              <Cpu className="w-3 h-3" />
              <div className="w-16 h-1.5 rounded-full bg-bg overflow-hidden flex">
                <div className="h-full bg-blue-400" style={{ width: bottleneck.limiter === 'cpu' ? '35%' : bottleneck.limiter === 'gpu' ? '65%' : '50%' }} />
                <div className="h-full bg-accent flex-1" />
              </div>
              <span>GPU</span>
            </div>
          </div>
        )}

        {/* Power distribution */}
        {power.total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-yellow-400" /> {t('perf.powerDist')}
              </span>
              <span className="text-xs font-bold text-white font-mono">{power.total}W</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {power.slices.map(s => (
                <div key={s.category} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} ${Math.round(s.pct)}%`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {power.slices.map(s => (
                <div key={s.category} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-white/45">{s.label} {s.watts}W</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
