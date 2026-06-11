import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Plus } from 'lucide-react'
import type { Message, Part } from '../../types'
import { TypingIndicator } from './TypingIndicator'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../data/parts'

interface MessageBubbleProps {
  message: Message
  onAddPart: (part: Part) => void
}

function formatContent(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.+<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
}

export function MessageBubble({ message, onAddPart }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isEmpty = message.isStreaming && !message.content

  const copy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`group max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-sm text-white'
              : 'rounded-bl-sm text-white/90 border border-white/[0.08] border-l-2 bg-surface2'
          }`}
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, #C8102E, #8B0000)',
                  boxShadow: '0 4px 20px rgba(200,16,46,0.25)',
                }
              : {
                  borderLeftColor: '#C9A84C40',
                  background: 'rgba(24,24,24,0.9)',
                }
          }
        >
          {isEmpty ? (
            <TypingIndicator />
          ) : (
            <div className="prose-dark">
              {isUser ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
              ) : (
                <>
                  <span
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                  />
                  {message.isStreaming && <span className="cursor-blink" />}
                </>
              )}
            </div>
          )}
        </div>

        {/* Suggested parts */}
        {!isUser && !message.isStreaming && (message.suggestedParts?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mt-1"
          >
            {message.suggestedParts!.map(part => (
              <button
                key={part.id}
                onClick={() => onAddPart(part)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-surface2 border border-white/10 hover:border-white/25
                  hover:bg-surface3 transition-all duration-150 group/part"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[part.category] }}
                />
                <span className="text-white/60 group-hover/part:text-white/90 transition-colors">
                  {CATEGORY_LABELS[part.category]}:
                </span>
                <span className="text-white font-semibold">{part.name}</span>
                <span className="text-gold font-mono">${part.price}</span>
                <Plus className="w-3 h-3 text-white/40 group-hover/part:text-accent transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        {!isUser && !isEmpty && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-0.5">
            <button
              onClick={copy}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/40
                hover:text-white/80 hover:bg-white/5 transition-all"
            >
              {copied ? (
                <><Check className="w-3 h-3 text-green-400" /> <span>Copied</span></>
              ) : (
                <><Copy className="w-3 h-3" /> <span>Copy</span></>
              )}
            </button>
            <span className="text-white/20 text-xs self-center">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
