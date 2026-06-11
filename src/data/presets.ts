import type { Build, PartCategory } from '../types'
import { PARTS } from './parts'

export interface Preset {
  id: string
  name: string
  tagline: string
  useCase: string
  tier: 'budget' | 'mid' | 'high-end' | 'enthusiast'
  accentColor: string
  highlights: string[]
  partIds: Partial<Record<PartCategory, string>>
}

export const PRESETS: Preset[] = [
  {
    id: 'the-destroyer',
    name: 'The Destroyer',
    tagline: 'No compromises. Period.',
    useCase: 'Enthusiast Gaming',
    tier: 'enthusiast',
    accentColor: '#C8102E',
    highlights: ['4K 240fps capable', 'RTX 5090 flagship GPU', '575W TDP — max power', 'AIO 360 liquid cooling'],
    partIds: {
      cpu:         'intel-ultra9-285k',
      motherboard: 'asus-rog-maximus-z890',
      gpu:         'rtx-5090',
      ram:         'corsair-dominator-ddr5-64',
      storage:     'samsung-990-pro-2tb',
      psu:         'corsair-hx1000i',
      case:        'lian-li-o11-dynamic',
      cooling:     'arctic-liquid-freezer-360',
    },
  },
  {
    id: 'blackout-pro',
    name: 'Blackout Pro',
    tagline: 'Stream, play, dominate.',
    useCase: 'Streaming & Gaming',
    tier: 'enthusiast',
    accentColor: '#00CFFF',
    highlights: ['1440p 240fps streaming', 'RTX 5080 16GB GDDR7', 'i9-14900K 24 cores', 'O11 Dynamic case'],
    partIds: {
      cpu:         'intel-i9-14900k',
      motherboard: 'asus-rog-maximus-z790',
      gpu:         'rtx-5080',
      ram:         'gskill-trident-ddr5-32',
      storage:     'samsung-990-pro-2tb',
      psu:         'corsair-hx1000i',
      case:        'lian-li-o11-dynamic',
      cooling:     'arctic-liquid-freezer-360',
    },
  },
  {
    id: 'sweet-spot',
    name: 'Sweet Spot',
    tagline: 'Best performance per dollar.',
    useCase: 'High-End Gaming',
    tier: 'high-end',
    accentColor: '#C9A84C',
    highlights: ['1440p 165fps high settings', 'RTX 5070 Ti', 'Ryzen 7 9700X Zen5', 'Noctua air cooling'],
    partIds: {
      cpu:         'amd-ryzen-7-9700x',
      motherboard: 'msi-mag-x670e',
      gpu:         'rtx-5070-ti',
      ram:         'gskill-trident-ddr5-32',
      storage:     'wd-black-sn850x-1tb',
      psu:         'seasonic-focus-850',
      case:        'fractal-torrent',
      cooling:     'noctua-nh-d15',
    },
  },
  {
    id: 'creator-pro',
    name: 'Creator Pro',
    tagline: 'Built for production.',
    useCase: 'Workstation',
    tier: 'enthusiast',
    accentColor: '#A855F7',
    highlights: ['16-core Zen5 CPU', '64GB DDR5-6000 RAM', 'RTX 4090 24GB VRAM', '3D/AI/Video rendering'],
    partIds: {
      cpu:         'amd-ryzen-9-9950x',
      motherboard: 'msi-mag-x670e',
      gpu:         'rtx-4090',
      ram:         'corsair-dominator-ddr5-64',
      storage:     'samsung-990-pro-2tb',
      psu:         'corsair-hx1000i',
      case:        'lian-li-o11-dynamic',
      cooling:     'arctic-liquid-freezer-360',
    },
  },
  {
    id: 'budget-dominator',
    name: 'Budget Dominator',
    tagline: 'Maximum fps per dollar.',
    useCase: 'Budget Gaming',
    tier: 'mid',
    accentColor: '#76FF7A',
    highlights: ['1080p 144fps ultra', 'RTX 5070 next-gen', 'Ryzen 5 7600X AM5', 'Upgradeable platform'],
    partIds: {
      cpu:         'amd-ryzen-5-7600x',
      motherboard: 'asrock-b650m-steel',
      gpu:         'rtx-5070',
      ram:         'gskill-flare-ddr5-32',
      storage:     'wd-black-sn850x-1tb',
      psu:         'seasonic-focus-850',
      case:        'fractal-torrent',
      cooling:     'noctua-nh-d15',
    },
  },
]

export function buildFromPreset(preset: Preset): Build {
  const result: Build = {}
  for (const [cat, id] of Object.entries(preset.partIds)) {
    const part = PARTS.find(p => p.id === id)
    if (part) (result as Record<string, typeof part>)[cat] = part
  }
  return result
}

export function presetTotalPrice(preset: Preset): number {
  return Object.values(preset.partIds).reduce((sum, id) => {
    const part = PARTS.find(p => p.id === id)
    return sum + (part?.price ?? 0)
  }, 0)
}
