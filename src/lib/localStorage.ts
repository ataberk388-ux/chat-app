import type { Build, Conversation } from '../types'

const CONV_KEY = 'pcbuilder-conversations'
const BUILD_KEY = 'pcbuilder-build'

export const convGet = (): Conversation[] => {
  try { return JSON.parse(localStorage.getItem(CONV_KEY) ?? '[]') }
  catch { return [] }
}

export const convSet = (conversations: Conversation[]) =>
  localStorage.setItem(CONV_KEY, JSON.stringify(conversations))

export const convAdd = (conv: Conversation) =>
  convSet([conv, ...convGet()])

export const convUpdate = (id: string, patch: Partial<Conversation>) =>
  convSet(convGet().map(c => c.id === id ? { ...c, ...patch } : c))

export const convDelete = (id: string) =>
  convSet(convGet().filter(c => c.id !== id))

export const buildGet = (): Build =>
  JSON.parse(localStorage.getItem(BUILD_KEY) ?? '{}')

export const buildSet = (build: Build) =>
  localStorage.setItem(BUILD_KEY, JSON.stringify(build))
