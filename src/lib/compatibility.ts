import type { Build, PartCategory } from '../types'

export interface CompatIssue {
  level: 'error' | 'warning' | 'ok'
  title: string
  detail: string
  parts: PartCategory[]
}

// helpers ----------------------------------------------------------------------

function ddrGen(s?: string): number | null {
  const m = s?.match(/DDR(\d)/i)
  return m ? parseInt(m[1]) : null
}

function watts(s?: string): number | null {
  const m = s?.match(/(\d+)\s*W/i)
  return m ? parseInt(m[1]) : null
}

const FORM_RANK: Record<string, number> = { 'ITX': 1, 'Mini-ITX': 1, 'mATX': 2, 'Micro-ATX': 2, 'ATX': 3, 'E-ATX': 4 }

/** Mid/Full towers accept up to ATX (E-ATX for full). Returns the largest board a case fits. */
function caseMaxForm(formFactor?: string): number {
  if (!formFactor) return 3
  const f = formFactor.toLowerCase()
  if (f.includes('full')) return 4
  if (f.includes('mini') || f.includes('itx')) return 1
  if (f.includes('micro')) return 2
  return 3 // mid tower → ATX
}

// engine -----------------------------------------------------------------------

export function checkCompatibility(build: Build, recommendedPsu: number): CompatIssue[] {
  const issues: CompatIssue[] = []
  const { cpu, motherboard: mobo, ram, gpu, psu, cooling, case: pcCase } = build

  // 1) CPU ↔ motherboard socket
  if (cpu && mobo) {
    const cs = cpu.specs.socket
    const ms = mobo.specs.socket
    if (cs && ms && cs !== ms) {
      issues.push({
        level: 'error',
        title: 'Socket uyumsuz',
        detail: `${cpu.name} (${cs}) ${mobo.name} (${ms}) ile uyumlu değil.`,
        parts: ['cpu', 'motherboard'],
      })
    } else if (cs && ms) {
      issues.push({ level: 'ok', title: 'Socket uyumlu', detail: `${cs} eşleşiyor.`, parts: ['cpu', 'motherboard'] })
    }
  }

  // 2) RAM ↔ motherboard memory generation
  if (ram && mobo) {
    const rg = ddrGen(ram.specs.speed)
    const mg = ddrGen(mobo.specs.memory)
    if (rg && mg && rg !== mg) {
      issues.push({
        level: 'error',
        title: 'Bellek tipi uyumsuz',
        detail: `${ram.name} DDR${rg}, ${mobo.name} DDR${mg} destekliyor.`,
        parts: ['ram', 'motherboard'],
      })
    }
  }

  // 3) Motherboard form factor ↔ case
  if (mobo && pcCase) {
    const boardRank = FORM_RANK[mobo.specs.formFactor ?? 'ATX'] ?? 3
    const caseRank = caseMaxForm(pcCase.specs.formFactor)
    if (boardRank > caseRank) {
      issues.push({
        level: 'error',
        title: 'Anakart kasaya sığmıyor',
        detail: `${mobo.specs.formFactor} anakart ${pcCase.name} için fazla büyük.`,
        parts: ['motherboard', 'case'],
      })
    }
  }

  // 4) Cooler capacity ↔ CPU TDP
  if (cpu && cooling) {
    const coolerCap = watts(cooling.specs.tdp)
    if (coolerCap && cpu.tdp && coolerCap < cpu.tdp) {
      issues.push({
        level: 'warning',
        title: 'Soğutucu zayıf olabilir',
        detail: `${cooling.name} (~${coolerCap}W) ${cpu.name} (${cpu.tdp}W) için sınırda. Yük altında throttle olabilir.`,
        parts: ['cooling', 'cpu'],
      })
    } else if (coolerCap && cpu.tdp) {
      issues.push({ level: 'ok', title: 'Soğutma yeterli', detail: `${coolerCap}W kapasite > ${cpu.tdp}W.`, parts: ['cooling', 'cpu'] })
    }
    // high-end CPU on stock-ish air
    if (cpu.tdp >= 170 && cooling.specs.type?.toLowerCase().includes('air')) {
      issues.push({
        level: 'warning',
        title: 'Yüksek TDP için sıvı soğutma önerilir',
        detail: `${cpu.name} (${cpu.tdp}W) için AIO sıvı soğutma daha iyi sıcaklık verir.`,
        parts: ['cpu', 'cooling'],
      })
    }
  }

  // 5) PSU wattage ↔ build draw
  if (psu) {
    const w = watts(psu.specs.wattage)
    if (w && w < recommendedPsu) {
      issues.push({
        level: 'error',
        title: 'PSU yetersiz',
        detail: `${psu.name} (${w}W) bu build için az. En az ${recommendedPsu}W önerilir.`,
        parts: ['psu'],
      })
    } else if (w) {
      const headroom = Math.round(((w - recommendedPsu) / w) * 100)
      issues.push({
        level: 'ok',
        title: 'PSU yeterli',
        detail: `${w}W — %${Math.max(headroom, 0)} headroom.`,
        parts: ['psu'],
      })
    }
  }

  // 6) Power-hungry GPU sanity
  if (gpu && psu) {
    const gpuW = watts(gpu.specs.power)
    const psuW = watts(psu.specs.wattage)
    if (gpuW && psuW && gpuW >= 350 && psuW < 850) {
      issues.push({
        level: 'warning',
        title: 'GPU için güçlü PSU gerekir',
        detail: `${gpu.name} (${gpuW}W) için 850W+ PSU önerilir.`,
        parts: ['gpu', 'psu'],
      })
    }
  }

  return issues
}

export function compatSummary(issues: CompatIssue[]): { errors: number; warnings: number; oks: number } {
  return {
    errors: issues.filter(i => i.level === 'error').length,
    warnings: issues.filter(i => i.level === 'warning').length,
    oks: issues.filter(i => i.level === 'ok').length,
  }
}
