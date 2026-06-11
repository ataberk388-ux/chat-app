import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { motion } from 'framer-motion'
import { Cpu, Zap, Bot } from 'lucide-react'
import { useT } from '../../lib/i18n'

interface LandingScreenProps {
  onEnter: () => void
}

export function LandingScreen({ onEnter }: LandingScreenProps) {
  const { t } = useT()
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

      tl.from('.land-logo', { y: -30, opacity: 0, duration: 1, scale: 0.8 })
        .from('.land-title-line', {
          y: 60, opacity: 0, duration: 1.2, stagger: 0.15, skewY: 3
        }, '-=0.6')
        .from('.land-sub', { y: 20, opacity: 0, duration: 0.8 }, '-=0.5')
        .from('.land-feature', { y: 30, opacity: 0, duration: 0.6, stagger: 0.12 }, '-=0.4')
        .from('.land-cta', { y: 20, opacity: 0, duration: 0.7, scale: 0.9 }, '-=0.2')
    }, containerRef)

    const handleMouseMove = (e: MouseEvent) => {
      if (!glowRef.current) return
      gsap.to(glowRef.current, {
        x: (e.clientX / window.innerWidth - 0.5) * 80,
        y: (e.clientY / window.innerHeight - 0.5) * 80,
        duration: 2,
        ease: 'power3.out',
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      ctx.revert()
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const features = [
    { icon: Bot, label: 'AI Assistant', desc: 'Expert advice' },
    { icon: Cpu, label: '3D Build', desc: 'Live visualization' },
    { icon: Zap, label: 'Smart Pick', desc: 'Compatibility check' },
  ]

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center h-screen overflow-hidden bg-bg grid-bg"
    >
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        autoPlay
        muted
        loop
        playsInline
        onError={e => (e.currentTarget.style.display = 'none')}
      >
        <source src="/videos/bg.mp4" type="video/mp4" />
      </video>

      {/* Ambient glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,16,46,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Corners */}
      <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-accent/40 opacity-60" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-accent/40 opacity-60" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-accent/40 opacity-60" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-accent/40 opacity-60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
        {/* Logo */}
        <div className="land-logo mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <span className="text-sm font-mono text-white/40 tracking-[0.3em] uppercase">
            PC Builder AI
          </span>
        </div>

        {/* Headline */}
        <div className="overflow-hidden mb-2">
          <h1 className="land-title-line text-6xl md:text-8xl font-black tracking-tight text-white leading-none">
            BUILD YOUR
          </h1>
        </div>
        <div className="overflow-hidden mb-8">
          <h1 className="land-title-line text-6xl md:text-8xl font-black tracking-tight leading-none"
            style={{ WebkitTextStroke: '1px rgba(200,16,46,0.8)', color: 'transparent' }}>
            DREAM PC
          </h1>
        </div>

        {/* Subtitle */}
        <p className="land-sub text-white/50 text-lg md:text-xl max-w-lg font-light mb-12 leading-relaxed">
          {t('landing.sub')}
        </p>

        {/* Features */}
        <div className="flex gap-6 mb-12">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="land-feature flex flex-col items-center gap-2 px-5 py-4
                bg-white/[0.03] border border-white/[0.07] rounded-xl backdrop-blur-sm"
            >
              <Icon className="w-5 h-5 text-accent" />
              <span className="text-white text-sm font-semibold">{label}</span>
              <span className="text-white/40 text-xs">{desc}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          className="land-cta group relative px-10 py-4 rounded-xl font-bold text-lg text-white
            overflow-hidden transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #C8102E, #8B0000)',
            boxShadow: '0 0 40px rgba(200,16,46,0.4)',
          }}
          onClick={onEnter}
          whileHover={{ scale: 1.04, boxShadow: '0 0 60px rgba(200,16,46,0.6)' }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="relative z-10">{t('landing.cta')}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
            translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </motion.button>

        <p className="mt-6 text-white/20 text-xs font-mono tracking-wider">
          {t('landing.tagline')}
        </p>
      </div>
    </div>
  )
}
