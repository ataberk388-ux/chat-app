import { useState, useCallback } from 'react'
import type { Build, Part, PartCategory } from '../types'
import { buildGet, buildSet } from '../lib/localStorage'

export function useBuild() {
  const [build, setBuild] = useState<Build>(buildGet)

  const addPart = useCallback((part: Part) => {
    setBuild(prev => {
      const next = { ...prev, [part.category]: part }
      buildSet(next)
      return next
    })
  }, [])

  const removePart = useCallback((category: PartCategory) => {
    setBuild(prev => {
      const next = { ...prev }
      delete next[category]
      buildSet(next)
      return next
    })
  }, [])

  const clearBuild = useCallback(() => {
    setBuild({})
    buildSet({})
  }, [])

  const loadBuild = useCallback((newBuild: Build) => {
    setBuild(newBuild)
    buildSet(newBuild)
  }, [])

  const totalPrice = Object.values(build).reduce((sum, p) => sum + (p?.price ?? 0), 0)

  const totalTdp = Object.values(build).reduce((sum, p) => sum + (p?.tdp ?? 0), 0)

  const recommendedPsu = Math.ceil((totalTdp * 1.2) / 50) * 50

  const partCount = Object.values(build).filter(Boolean).length

  return { build, addPart, removePart, clearBuild, setBuild: loadBuild, totalPrice, totalTdp, recommendedPsu, partCount }
}
