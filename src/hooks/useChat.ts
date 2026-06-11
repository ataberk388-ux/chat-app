import { useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import type { Conversation, Message, Part } from '../types'
import { convUpdate } from '../lib/localStorage'
import { findPartsByNames } from '../data/parts'

const MODEL = 'claude-sonnet-4-6'

interface UseChatProps {
  conversation: Conversation
  onUpdate: (updated: Conversation) => void
}

export function useChat({ conversation, onUpdate }: UseChatProps) {
  const queryClient = useQueryClient()
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return
    setError(null)

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      createdAt: Date.now(),
    }

    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
    }

    const isFirst = conversation.messages.length === 0
    const title = isFirst
      ? content.trim().slice(0, 48).replace(/\n/g, ' ')
      : conversation.title

    const withUser: Conversation = {
      ...conversation,
      title,
      messages: [...conversation.messages, userMsg, assistantMsg],
      updatedAt: Date.now(),
    }

    onUpdate(withUser)
    setIsStreaming(true)
    bufferRef.current = ''
    abortRef.current = new AbortController()

    const apiMessages = [...conversation.messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: (await import('../lib/systemPrompt')).buildSystemPrompt(),
          model: MODEL,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ''

      const updateAssistant = (text: string, streaming: boolean): Conversation => ({
        ...withUser,
        messages: withUser.messages.map(m =>
          m.id === assistantMsg.id ? { ...m, content: text, isStreaming: streaming } : m
        ),
        updatedAt: Date.now(),
      })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          const evt = JSON.parse(raw) as { type: string; text?: string; error?: string }

          if (evt.type === 'delta' && evt.text) {
            bufferRef.current += evt.text
            onUpdate(updateAssistant(bufferRef.current, true))
          } else if (evt.type === 'done') {
            break
          } else if (evt.type === 'error') {
            throw new Error(evt.error ?? 'Stream error')
          }
        }
      }

      const finalText = bufferRef.current
      const suggestedParts: Part[] = findPartsByNames(finalText)

      const finalConv: Conversation = {
        ...withUser,
        messages: withUser.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: finalText, isStreaming: false, suggestedParts }
            : m
        ),
        updatedAt: Date.now(),
      }

      onUpdate(finalConv)
      convUpdate(conversation.id, finalConv)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        const partial = bufferRef.current || '(stopped)'
        const stoppedConv: Conversation = {
          ...withUser,
          messages: withUser.messages.map(m =>
            m.id === assistantMsg.id ? { ...m, content: partial, isStreaming: false } : m
          ),
          updatedAt: Date.now(),
        }
        onUpdate(stoppedConv)
        convUpdate(conversation.id, stoppedConv)
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        const rollback: Conversation = {
          ...conversation,
          messages: [...conversation.messages, userMsg],
          updatedAt: Date.now(),
        }
        onUpdate(rollback)
        convUpdate(conversation.id, rollback)
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } finally {
      setIsStreaming(false)
    }
  }, [conversation, isStreaming, onUpdate, queryClient])

  return { sendMessage, isStreaming, stopStreaming, error }
}
