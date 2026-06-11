import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-gold/70"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
