export type Model = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6' | 'claude-opus-4-8'

export type PartCategory = 'cpu' | 'gpu' | 'ram' | 'storage' | 'motherboard' | 'psu' | 'case' | 'cooling'

export interface Part {
  id: string
  category: PartCategory
  brand: string
  name: string
  fullName: string
  price: number
  specs: Record<string, string>
  image: string
  tier: 'budget' | 'mid' | 'high-end' | 'enthusiast'
  tdp: number
  color: string
}

export interface Build {
  cpu?: Part
  gpu?: Part
  ram?: Part
  storage?: Part
  motherboard?: Part
  psu?: Part
  case?: Part
  cooling?: Part
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  isStreaming?: boolean
  suggestedParts?: Part[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}
