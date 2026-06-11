import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { getModelEntry, type ModelEntry } from './modelRegistry'

// ─── Error boundary → procedural fallback ─────────────────────────────────────
// If a registered .glb fails to load (missing file, parse error) we silently fall
// back to the procedural model instead of crashing the canvas.

class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[GLTFPart] model load failed, using procedural fallback:', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// ─── Loaded GLTF primitive ────────────────────────────────────────────────────

function LoadedModel({ entry }: { entry: ModelEntry }) {
  const { scene } = useGLTF(entry.path)
  // clone so the same model can be instanced and transformed independently
  const cloned = useMemo(() => scene.clone(true), [scene])
  return (
    <primitive
      object={cloned}
      scale={entry.scale ?? 1}
      rotation={entry.rotation ?? [0, 0, 0]}
      position={entry.offset ?? [0, 0, 0]}
    />
  )
}

// ─── Public wrapper ───────────────────────────────────────────────────────────
// Renders the registered GLTF model for a part if one exists, otherwise the
// procedural fallback. Always offline-safe: with an empty registry it renders the
// fallback directly without ever touching the network.

interface GLTFPartProps {
  category: string
  partId?: string
  children: ReactNode // procedural fallback
}

export function GLTFPart({ category, partId, children }: GLTFPartProps) {
  const entry = getModelEntry(category, partId)
  if (!entry) return <>{children}</>
  return (
    <ModelErrorBoundary fallback={children}>
      <Suspense fallback={children}>
        <LoadedModel entry={entry} />
      </Suspense>
    </ModelErrorBoundary>
  )
}
