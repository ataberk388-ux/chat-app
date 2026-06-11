import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, AlertCircle, Sparkles } from 'lucide-react'
import type { Conversation, Part } from '../../types'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import { useChat } from '../../hooks/useChat'

interface ChatPanelProps {
  conversation: Conversation
  onUpdate: (conv: Conversation) => void
  onAddPart: (part: Part) => void
}

export function ChatPanel({ conversation, onUpdate, onAddPart }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { sendMessage, isStreaming, stopStreaming, error } = useChat({
    conversation,
    onUpdate,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages])

  const isEmpty = conversation.messages.length === 0

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]
        bg-surface/60 backdrop-blur-md flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30
          flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">AI Assistant</h2>
          <p className="text-xs text-white/35">PC Build Consultant</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/30">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20
              flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-white font-semibold text-base mb-2">
              What are you building?
            </h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Tell me your budget, use case, and requirements. I'll recommend the perfect components.
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {conversation.messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onAddPart={onAddPart}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mt-4 px-4 py-3 bg-red-900/20 border
              border-red-800/40 rounded-xl text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <InputBar
        onSend={sendMessage}
        isStreaming={isStreaming}
        onStop={stopStreaming}
      />
    </div>
  )
}
