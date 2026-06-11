import { Suspense, useRef, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer, ContactShadows, Stars, SoftShadows } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { Vector3, MOUSE } from 'three'
import { X, Cpu, Info } from 'lucide-react'
import { PCModel } from './PCModel'
import { getCaseCfg, computeLayout, getPartFocus, rotateY, HOME_VIEW, type V3 } from './layout'
import { modelState } from './modelState'
import type { Build, PartCategory } from '../../types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../../data/parts'

// ─── Camera animator ──────────────────────────────────────────────────────────
// On selection, captures the model's live Y rotation (which PCModel pauses while a
// part is selected) and computes the part's world position + an outward camera
// position, both rotated by that angle so the framing tracks the paused part.

function add(a: V3, b: V3): V3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] }

function CameraAnimator({
  selectedPart, build, explode, onReady,
}: {
  selectedPart: string | null
  build: Build
  explode: number
  onReady: (orbitEnabled: boolean) => void
}) {
  const { camera } = useThree()
  const layout = useMemo(() => computeLayout(getCaseCfg(build.case?.id)), [build.case?.id])

  const targetPos = useRef(new Vector3(...HOME_VIEW.pos))
  const targetLook = useRef(new Vector3(...HOME_VIEW.target))
  const currentLook = useRef(new Vector3(...HOME_VIEW.target))
  const moving = useRef(false)
  const prevPart = useRef<string | null>(null)

  useEffect(() => {
    if (selectedPart === prevPart.current) return
    prevPart.current = selectedPart

    if (selectedPart && selectedPart !== 'case') {
      const r = modelState.rotationY
      // focus follows the part to its exploded position when exploded
      const { target, offset } = getPartFocus(selectedPart, layout, explode)
      const worldTarget = rotateY(target, r)
      const worldPos = add(worldTarget, rotateY(offset, r))
      targetLook.current.set(...worldTarget)
      targetPos.current.set(...worldPos)
    } else {
      targetLook.current.set(...HOME_VIEW.target)
      targetPos.current.set(...HOME_VIEW.pos)
    }
    moving.current = true
    onReady(false)
  }, [selectedPart, layout, explode])

  useFrame(() => {
    if (!moving.current) return
    camera.position.lerp(targetPos.current, 0.09)
    currentLook.current.lerp(targetLook.current, 0.09)
    camera.lookAt(currentLook.current)
    if (
      camera.position.distanceTo(targetPos.current) < 0.008 &&
      currentLook.current.distanceTo(targetLook.current) < 0.008
    ) {
      moving.current = false
      onReady(!selectedPart)
    }
  })

  return null
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[0.9, 1.3, 0.68]} />
      <meshStandardMaterial color="#111" wireframe />
    </mesh>
  )
}

// Exposes a PNG capture function (needs preserveDrawingBuffer on the gl).
function CaptureBridge({ captureRef }: { captureRef: React.MutableRefObject<(() => string) | null> }) {
  const { gl, scene, camera } = useThree()
  captureRef.current = () => {
    gl.render(scene, camera) // ensure the current frame is in the buffer
    return gl.domElement.toDataURL('image/png')
  }
  return null
}

// ─── Part detail overlay ──────────────────────────────────────────────────────

function PartOverlay({
  category,
  build,
  onClose,
  onRemove,
}: {
  category: PartCategory
  build: Build
  onClose: () => void
  onRemove: () => void
}) {
  const partData = build[category]
  const color = CATEGORY_COLORS[category]
  const label = CATEGORY_LABELS[category]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!partData) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20
        w-[520px] max-w-[calc(100%-2rem)]"
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,8,8,0.97)',
          border: `1px solid ${color}50`,
          boxShadow: `0 0 60px ${color}20, 0 24px 64px rgba(0,0,0,0.7)`,
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="h-[2px]" style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }} />

        <div className="p-5">
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}12`, border: `1px solid ${color}30` }}
            >
              <Cpu className="w-5 h-5" style={{ color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color }}>
                  {label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full
                  bg-white/[0.06] text-white/40 border border-white/[0.08]">
                  {partData.tier}
                </span>
              </div>
              <h3 className="text-base font-black text-white leading-tight">{partData.fullName}</h3>
              <p className="text-xs text-white/40 mt-0.5">{partData.brand}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right mr-1">
                <p className="text-[10px] text-white/25">Price</p>
                <p className="text-lg font-black text-gold font-mono">${partData.price}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.10]
                  flex items-center justify-center text-white/30 hover:text-white
                  transition-all border border-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Specs grid */}
          {Object.keys(partData.specs).length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {Object.entries(partData.specs).map(([key, val]) => (
                <div key={key}
                  className="bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.05]">
                  <p className="text-[9px] text-white/25 uppercase tracking-wide mb-0.5">{key}</p>
                  <p className="text-xs font-semibold text-white/80 truncate">{String(val)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-xs text-white/25">
              <Info className="w-3 h-3" />
              <span>Right-drag to rotate · ESC to close</span>
            </div>
            <button
              onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                text-red-400/80 hover:text-red-400 bg-red-900/10 hover:bg-red-900/20
                border border-red-900/20 hover:border-red-800/40 transition-all"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── PCScene ──────────────────────────────────────────────────────────────────

interface PCSceneProps {
  build: Build
  selectedPart: PartCategory | null
  onSelectPart: (cat: PartCategory | null) => void
  onRemovePart?: (cat: PartCategory) => void
  explode?: number
  captureRef?: React.MutableRefObject<(() => string) | null>
}

export function PCScene({ build, selectedPart, onSelectPart, onRemovePart, explode = 0, captureRef }: PCSceneProps) {
  const handleReady = useCallback(() => {}, [])

  const handlePartClick = useCallback((cat: string) => {
    // allow selecting empty slots too (opens the swap/add picker in the side panel)
    onSelectPart(selectedPart === cat ? null : cat as PartCategory)
  }, [selectedPart, onSelectPart])

  const handleClose = useCallback(() => onSelectPart(null), [onSelectPart])

  const handleRemove = useCallback(() => {
    if (selectedPart && onRemovePart) onRemovePart(selectedPart)
    handleClose()
  }, [selectedPart, onRemovePart, handleClose])

  // Left-click on canvas background = deselect
  const handleCanvasBgClick = useCallback(() => {
    if (selectedPart) handleClose()
  }, [selectedPart, handleClose])

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: HOME_VIEW.pos, fov: 42, near: 0.5, far: 150 }}
        gl={{ antialias: true, alpha: true, toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
        shadows="soft"
        onClick={handleCanvasBgClick}
      >
        {/* transparent canvas — the dark page background shows through behind the stars */}


        {/* Soft contact/penumbra shadows (PCSS) */}
        <SoftShadows size={26} samples={12} focus={0.4} />

        {/* Studio 3-point rig + image-based lighting fills the rest */}
        <ambientLight intensity={0.12} />
        <directionalLight
          position={[3.5, 5, 3]}
          intensity={1.6}
          color="#fff4e6"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        >
          <orthographicCamera attach="shadow-camera" args={[-2, 2, 2, -2, 0.1, 12]} />
        </directionalLight>
        {/* cool fill */}
        <directionalLight position={[-4, 1.5, -2]} intensity={0.5} color="#9ec5ff" />
        {/* warm/gold rim from behind */}
        <spotLight position={[-2, 3, -3]} angle={0.6} penumbra={1} intensity={1.2} color="#C9A84C" />
        {/* subtle accent under-glow */}
        <pointLight position={[1.5, -1.5, 2]} color="#C8102E" intensity={0.4} distance={6} />

        {/* starfield backdrop — big, dense, clearly visible */}
        <Stars radius={45} depth={60} count={5000} factor={6} saturation={0} fade speed={0.5} />

        <CameraAnimator selectedPart={selectedPart} build={build} explode={explode} onReady={handleReady} />
        {captureRef && <CaptureBridge captureRef={captureRef} />}

        <Suspense fallback={<LoadingBox />}>
          <PCModel
            build={build}
            selectedPart={selectedPart}
            onPartClick={handlePartClick}
            explode={explode}
          />
        </Suspense>

        {/* Soft reflections from dim light cards — kept low so metals don't blow out */}
        <Environment resolution={256} environmentIntensity={0.25}>
          <Lightformer form="rect" intensity={0.4} position={[0, 3, 1]} scale={[7, 3, 1]} color="#aab2c2" />
          <Lightformer form="rect" intensity={0.35} position={[-3.5, 1, -2]} scale={[4, 5, 1]} color="#4f6a96" />
          <Lightformer form="rect" intensity={0.35} position={[3.5, 1, -1]} scale={[4, 5, 1]} color="#96825a" />
          <Lightformer form="ring" intensity={0.3} position={[2.5, 2.5, 2.5]} scale={2.5} color="#6e5d28" />
        </Environment>

        {/* single neutral soft contact shadow — natural grounding, no fake colored glow */}
        <ContactShadows position={[0, -0.76, 0]} opacity={0.5} scale={4.5} blur={3.2} far={2} resolution={1024} color="#000000" />

        {/* Right-drag rotates, left-click selects. Controls pause while a part is focused. */}
        <OrbitControls
          enabled={!selectedPart}
          enablePan={false}
          enableZoom
          mouseButtons={{
            LEFT: MOUSE.PAN,    // pan disabled, so left-click passes through to parts
            MIDDLE: MOUSE.DOLLY,
            RIGHT: MOUSE.ROTATE,
          }}
          maxPolarAngle={Math.PI / 1.9}
          minPolarAngle={Math.PI / 5}
          minDistance={1.8}
          maxDistance={6}
          dampingFactor={0.07}
          enableDamping
        />

        {/* No post-processing at all — no oval vignette, no bloom, no artifacts. */}
      </Canvas>

      {/* Hint */}
      {!selectedPart && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-black/50 border border-white/[0.08] text-white/30 text-xs">
            <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
            Left-click part to inspect · Right-drag to rotate
          </div>
        </div>
      )}

      {/* Part overlay */}
      <AnimatePresence>
        {selectedPart && (
          <PartOverlay
            key={selectedPart}
            category={selectedPart}
            build={build}
            onClose={handleClose}
            onRemove={handleRemove}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
