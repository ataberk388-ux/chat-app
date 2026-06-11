import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Send, Square, Lightbulb } from 'lucide-react'

interface InputBarProps {
  onSend: (content: string) => void
  isStreaming: boolean
  onStop: () => void
  disabled?: boolean
}

const SUGGESTIONS = [
  'Best gaming PC for $1500?',
  'Workstation for 3D rendering under $3000',
  'Budget PC for video editing ~$800',
  'What GPU pairs best with i9-14900K?',
]

export function InputBar({ onSend, isStreaming, onStop, disabled }: InputBarProps) {
  const [value, setValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`
  }, [value])

  const submit = () => {
    if (!value.trim() || disabled || isStreaming) return
    onSend(value.trim())
    setValue('')
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="relative p-4 border-t border-white/[0.06]">
      {/* Suggestions */}
      {showSuggestions && !value && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-full left-4 right-4 mb-2 bg-surface border border-white/[0.08]
            rounded-xl overflow-hidden shadow-2xl"
        >
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setValue(s); setShowSuggestions(false); ref.current?.focus() }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white
                hover:bg-white/5 transition-colors border-b border-white/[0.04] last:border-0"
            >
              {s}
            </button>
          ))}
        </motion.div>
      )}

      <div className="flex items-end gap-2">
        {/* Suggestions toggle */}
        <button
          onClick={() => setShowSuggestions(v => !v)}
          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
            transition-all border ${
            showSuggestions
              ? 'bg-gold/10 border-gold/30 text-gold'
              : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.07]'
          }`}
          title="Suggestions"
        >
          <Lightbulb className="w-4 h-4" />
        </button>

        {/* Textarea container */}
        <div className="flex-1 relative bg-surface2 border border-white/[0.08] rounded-xl
          focus-within:border-white/20 transition-colors">
          <textarea
            ref={ref}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setShowSuggestions(false)}
            disabled={disabled}
            placeholder="Describe your needs or ask about parts..."
            rows={1}
            className="w-full bg-transparent resize-none px-4 py-3 text-sm text-white
              placeholder:text-white/25 outline-none min-h-[44px] leading-relaxed"
            style={{ maxHeight: '160px' }}
          />
        </div>

        {/* Send / Stop */}
        {isStreaming ? (
          <motion.button
            onClick={onStop}
            whileTap={{ scale: 0.92 }}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-900/30 border border-red-800/40
              text-red-400 flex items-center justify-center hover:bg-red-900/50 transition-colors"
          >
            <Square className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            onClick={submit}
            disabled={!value.trim() || disabled}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
              transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: value.trim() ? 'linear-gradient(135deg, #C8102E, #8B0000)' : 'rgba(255,255,255,0.05)',
              border: value.trim() ? '1px solid rgba(200,16,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: value.trim() ? '0 0 16px rgba(200,16,46,0.3)' : 'none',
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        )}
      </div>

      <p className="text-center text-white/15 text-xs mt-2">
        Ctrl/Cmd + Enter to send
      </p>
    </div>
  )
}
