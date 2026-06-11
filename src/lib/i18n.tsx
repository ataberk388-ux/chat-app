import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Lang = 'en' | 'tr'

const LANG_KEY = 'pcbuilder-lang'

type Dict = Record<string, string>

const EN: Dict = {
  // header / tabs
  'tab.chat': 'AI Chat',
  'tab.build': '3D Build',
  'tab.parts': 'Parts',
  'tab.presets': 'Presets',
  'tab.mybuild': 'My Build',
  // categories
  'cat.cpu': 'Processor',
  'cat.gpu': 'Graphics Card',
  'cat.ram': 'Memory',
  'cat.storage': 'Storage',
  'cat.motherboard': 'Motherboard',
  'cat.psu': 'Power Supply',
  'cat.case': 'Case',
  'cat.cooling': 'Cooling',
  // landing
  'landing.sub': 'Describe your needs. Our AI recommends the perfect parts. Watch your build come to life in 3D.',
  'landing.cta': 'Start Configuring',
  'landing.tagline': 'AI-POWERED · REAL-TIME 3D',
  // build page
  'build.componentList': 'Component List',
  'build.reset': 'Reset',
  'build.clickToAdd': 'Click to add',
  'build.emptySlot': 'Empty slot',
  'build.swap': 'Swap',
  'build.exploded': 'Exploded View',
  'build.assemble': 'Assemble',
  'build.compatibility': 'Compatibility',
  'build.noConflicts': 'No conflicts detected',
  'build.allGood': 'All good',
  'build.completion': 'Build completion',
  'build.total': 'Total',
  'build.hint': 'Left-click part · Right-drag to rotate · Scroll to zoom',
  // my build
  'mybuild.title': 'My Build',
  'mybuild.slotsFilled': '{n} of 8 slots filled',
  'mybuild.shareLink': 'Share Link',
  'mybuild.save': 'Save',
  'mybuild.copy': 'Copy',
  'mybuild.clear': 'Clear',
  'mybuild.totalCost': 'Total Cost',
  'mybuild.powerDraw': 'Power Draw',
  'mybuild.status': 'Status',
  'mybuild.ready': 'Ready to Build',
  'mybuild.savedBuilds': 'Saved Builds',
  'mybuild.load': 'Load',
  'mybuild.buildName': 'Build name (e.g. Gaming Rig)',
  // performance
  'perf.title': 'Performance Estimate',
  'perf.subtitle': 'Approximate FPS at ultra settings',
  'perf.bottleneck': 'Bottleneck',
  'perf.balanced': 'Well balanced',
  'perf.cpuLimited': 'CPU-limited (~{n}%)',
  'perf.gpuLimited': 'GPU-limited (~{n}%)',
  'perf.powerDist': 'Power Distribution',
  'perf.needCpuGpu': 'Add a CPU and GPU to see performance estimates.',
  'perf.fpsAvg': 'avg fps',
  // rgb
  'rgb.title': 'RGB Lighting',
  'rgb.rainbow': 'Rainbow',
  // screenshot
  'shot.capture': 'Screenshot',
  'shot.saved': 'Screenshot saved',
}

const TR: Dict = {
  'tab.chat': 'AI Sohbet',
  'tab.build': '3D Kurulum',
  'tab.parts': 'Parçalar',
  'tab.presets': 'Hazır Sistemler',
  'tab.mybuild': 'Kurulumum',
  'cat.cpu': 'İşlemci',
  'cat.gpu': 'Ekran Kartı',
  'cat.ram': 'Bellek (RAM)',
  'cat.storage': 'Depolama',
  'cat.motherboard': 'Anakart',
  'cat.psu': 'Güç Kaynağı',
  'cat.case': 'Kasa',
  'cat.cooling': 'Soğutma',
  'landing.sub': 'İhtiyaçlarını anlat. Yapay zekâ en uygun parçaları önersin. Kurulumun 3D olarak canlansın.',
  'landing.cta': 'Yapılandırmaya Başla',
  'landing.tagline': 'YAPAY ZEKÂ · GERÇEK ZAMANLI 3D',
  'build.componentList': 'Parça Listesi',
  'build.reset': 'Sıfırla',
  'build.clickToAdd': 'Eklemek için tıkla',
  'build.emptySlot': 'Boş slot',
  'build.swap': 'Değiştir',
  'build.exploded': 'Patlamış Görünüm',
  'build.assemble': 'Birleştir',
  'build.compatibility': 'Uyumluluk',
  'build.noConflicts': 'Çakışma yok',
  'build.allGood': 'Her şey yolunda',
  'build.completion': 'Kurulum tamamlanma',
  'build.total': 'Toplam',
  'build.hint': 'Sol tık: parça seç · Sağ tık sürükle: döndür · Kaydır: yakınlaştır',
  'mybuild.title': 'Kurulumum',
  'mybuild.slotsFilled': '8 slottan {n} tanesi dolu',
  'mybuild.shareLink': 'Bağlantı Paylaş',
  'mybuild.save': 'Kaydet',
  'mybuild.copy': 'Kopyala',
  'mybuild.clear': 'Temizle',
  'mybuild.totalCost': 'Toplam Maliyet',
  'mybuild.powerDraw': 'Güç Tüketimi',
  'mybuild.status': 'Durum',
  'mybuild.ready': 'Kurmaya Hazır',
  'mybuild.savedBuilds': 'Kayıtlı Kurulumlar',
  'mybuild.load': 'Yükle',
  'mybuild.buildName': 'Kurulum adı (örn. Oyun Sistemi)',
  'perf.title': 'Performans Tahmini',
  'perf.subtitle': 'Ultra ayarlarda yaklaşık FPS',
  'perf.bottleneck': 'Darboğaz',
  'perf.balanced': 'Dengeli',
  'perf.cpuLimited': 'CPU sınırlı (~%{n})',
  'perf.gpuLimited': 'GPU sınırlı (~%{n})',
  'perf.powerDist': 'Güç Dağılımı',
  'perf.needCpuGpu': 'Performans tahmini için CPU ve GPU ekle.',
  'perf.fpsAvg': 'ort. fps',
  'rgb.title': 'RGB Aydınlatma',
  'rgb.rainbow': 'Gökkuşağı',
  'shot.capture': 'Ekran Görüntüsü',
  'shot.saved': 'Ekran görüntüsü kaydedildi',
}

const DICTS: Record<Lang, Dict> = { en: EN, tr: TR }

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const Ctx = createContext<I18nCtx>({ lang: 'en', setLang: () => {}, t: k => k })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY)
    return saved === 'tr' || saved === 'en' ? saved : 'tr'
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(LANG_KEY, l)
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let str = DICTS[lang][key] ?? DICTS.en[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, String(v))
    return str
  }, [lang])

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export function useT() {
  return useContext(Ctx)
}
