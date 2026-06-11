import { useRef, useMemo, useState, useEffect, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import {
  CylinderGeometry, TorusGeometry, TubeGeometry, CatmullRomCurve3,
  Vector3, Shape, ShapeGeometry,
} from 'three'
import type * as THREE from 'three'
import type { Build } from '../../types'
import { getCaseCfg, computeLayout, EXPLODE_DIRS, type CaseCfg, type V3 } from './layout'
import { modelState } from './modelState'
import { applyRgb } from './rgbState'
import { GLTFPart } from './GLTFPart'

type Facing = 'z+' | 'z-' | 'y+' | 'y-' | 'x+' | 'x-'

// ─── Reusable PBR materials ───────────────────────────────────────────────────
// Physically-based so the warehouse HDRI + N8AO do the heavy lifting on realism.

function MatMetal({ color = '#8d9097', rough = 0.3, metal = 0.95 }: { color?: string; rough?: number; metal?: number }) {
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough} envMapIntensity={1.25} />
}
function MatChrome({ color = '#c2c6cc' }: { color?: string }) {
  return <meshStandardMaterial color={color} metalness={0.95} roughness={0.32} envMapIntensity={0.9} />
}
function MatPlastic({ color = '#161616', rough = 0.42 }: { color?: string; rough?: number }) {
  return <meshPhysicalMaterial color={color} metalness={0} roughness={rough} clearcoat={0.6} clearcoatRoughness={0.32} envMapIntensity={1} />
}
function MatPcb({ color = '#0a1000' }: { color?: string }) {
  return <meshPhysicalMaterial color={color} metalness={0.1} roughness={0.48} clearcoat={0.55} clearcoatRoughness={0.35} envMapIntensity={0.85} />
}
function MatAnodized({ color = '#17171c', rough = 0.4 }: { color?: string; rough?: number }) {
  return <meshPhysicalMaterial color={color} metalness={0.85} roughness={rough} clearcoat={0.35} clearcoatRoughness={0.4} envMapIntensity={1.1} />
}
function MatEmis({ color, intensity = 0.6 }: { color: string; intensity?: number }) {
  // polygonOffset keeps these thin glowing decals in front of the surface they sit
  // on, so they never z-fight / flicker against it.
  return (
    <meshStandardMaterial
      color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false}
      polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}
    />
  )
}
function MatGold() {
  return <meshStandardMaterial color="#c8a23a" metalness={1} roughness={0.22} envMapIntensity={1.4} />
}

// ─── Install / swap spring animation ──────────────────────────────────────────

function easeOutBack(x: number): number {
  const c3 = 2.70158
  return 1 + c3 * Math.pow(x - 1, 3) + (c3 - 1) * Math.pow(x - 1, 2)
}

function Installable({ signature, delay = 0, children }: { signature: string; delay?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!)
  const progress = useRef(0)
  const timer = useRef(0)
  const prevSig = useRef<string>('')

  useFrame((_, delta) => {
    if (!ref.current) return
    if (signature !== prevSig.current) {
      prevSig.current = signature
      progress.current = 0
      timer.current = 0
    }
    timer.current += delta
    // Hide entirely until its turn — avoids a sub-pixel cluster of emissives
    // collapsing into a single ultra-bright pixel (which bloom turns into a white burst).
    const ready = timer.current >= delay
    ref.current.visible = ready
    if (!ready) return
    if (progress.current < 1) progress.current = Math.min(1, progress.current + delta * 3.0)
    const p = progress.current
    // start at 0.5 (never near zero) so emissives are never concentrated
    ref.current.scale.setScalar(0.5 + 0.5 * easeOutBack(p))
    ref.current.position.set(0, (1 - p) * 0.35, (1 - p) * 0.18)
  })

  return <group ref={ref}>{children}</group>
}

// ─── Exploded-view offset (smoothly lerps part outward) ───────────────────────

function Exploded({ part, amount, children }: { part: string; amount: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!)
  const cur = useRef(0)
  const dir = EXPLODE_DIRS[part] ?? [0, 0, 0]
  useFrame(() => {
    if (!ref.current) return
    cur.current += (amount - cur.current) * 0.12
    ref.current.position.set(dir[0] * cur.current, dir[1] * cur.current, dir[2] * cur.current)
  })
  return <group ref={ref}>{children}</group>
}

// ─── Fan blade airfoil ─────────────────────────────────────────────────────────

function makeBladeShape(radius: number): ShapeGeometry {
  const sh = new Shape()
  sh.moveTo(0, 0)
  sh.bezierCurveTo(radius * 0.15, radius * 0.12, radius * 0.8, radius * 0.22, radius, radius * 0.08)
  sh.bezierCurveTo(radius * 0.9, -radius * 0.05, radius * 0.3, -radius * 0.09, 0, 0)
  return new ShapeGeometry(sh)
}

function facingRot(facing: Facing): V3 {
  switch (facing) {
    case 'y+': case 'y-': return [-Math.PI / 2, 0, 0]
    case 'x+': return [0, Math.PI / 2, 0]
    case 'x-': return [0, -Math.PI / 2, 0]
    default: return [0, 0, 0]
  }
}

// ─── SpinFan ──────────────────────────────────────────────────────────────────

function SpinFan({
  pos, radius = 0.08, blades = 9, color = '#1a1a1a', glowColor = '#00aaff', facing = 'z+',
}: {
  pos: V3; radius?: number; blades?: number; color?: string; glowColor?: string; facing?: Facing
}) {
  const fanRef = useRef<THREE.Group>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const ledRef = useRef<THREE.MeshStandardMaterial>(null!)
  const bladeGeo = useMemo(() => makeBladeShape(radius), [radius])
  const hubGeo = useMemo(() => new CylinderGeometry(radius * 0.17, radius * 0.19, 0.018, 24), [radius])
  const ringGeo = useMemo(() => new TorusGeometry(radius, 0.012, 16, 48), [radius])
  const screwGeo = useMemo(() => new CylinderGeometry(0.005, 0.005, 0.012, 10), [])
  const spinDir = (facing === 'y-' || facing === 'z-' || facing === 'x-') ? 1 : -1

  useFrame((_, delta) => {
    if (fanRef.current) fanRef.current.rotation.z += spinDir * delta * 9
    if (lightRef.current) lightRef.current.intensity = 0.18 + Math.sin(Date.now() * 0.003) * 0.1
    if (ledRef.current) { applyRgb(ledRef.current.emissive); ledRef.current.color.copy(ledRef.current.emissive) }
  })

  return (
    <group position={pos} rotation={facingRot(facing)}>
      <mesh geometry={ringGeo}><MatAnodized color={color} rough={0.35} /></mesh>
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
        <mesh key={i} geometry={screwGeo} position={[sx * radius * 0.86, sy * radius * 0.86, 0.004]}>
          <MatMetal color="#3a3a3a" rough={0.3} />
        </mesh>
      ))}
      <group ref={fanRef}>
        {Array.from({ length: blades }).map((_, i) => (
          <mesh key={i} geometry={bladeGeo} rotation={[0.16, 0, (i / blades) * Math.PI * 2]}>
            <meshPhysicalMaterial color={color} metalness={0.1} roughness={0.45} clearcoat={0.5} clearcoatRoughness={0.4} side={2} transparent opacity={0.94} />
          </mesh>
        ))}
      </group>
      <mesh geometry={hubGeo} rotation={[Math.PI / 2, 0, 0]}><MatPlastic color="#0d0d0d" rough={0.3} /></mesh>
      <mesh>
        <torusGeometry args={[radius * 0.24, 0.005, 12, 28]} />
        <meshStandardMaterial ref={ledRef} color={glowColor} emissive={glowColor} emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} color={glowColor} intensity={0.18} distance={0.5} />
    </group>
  )
}

// ─── Fan grill (exterior exhaust) ──────────────────────────────────────────────

function FanGrill({ pos, radius = 0.08, facing = 'z+', color = '#2a2a2a' }: {
  pos: V3; radius?: number; facing?: Facing; color?: string
}) {
  return (
    <group position={pos} rotation={facingRot(facing)}>
      <mesh><circleGeometry args={[radius + 0.012, 36]} /><MatPlastic color="#060606" rough={0.5} /></mesh>
      {[0.32, 0.58, 0.82, 1.0].map((t, i) => (
        <mesh key={i}><torusGeometry args={[radius * t, 0.0035, 10, 32]} /><MatMetal color={color} rough={0.35} /></mesh>
      ))}
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((a, i) => (
        <mesh key={`s${i}`} rotation={[0, 0, a]}>
          <boxGeometry args={[radius * 2, 0.0035, 0.0035]} /><MatMetal color={color} rough={0.35} />
        </mesh>
      ))}
    </group>
  )
}

// ─── RGB strip ──────────────────────────────────────────────────────────────────

function RGBStrip({ pos, length = 0.3, axis = 'x' }: { pos: V3; length?: number; axis?: 'x' | 'y' | 'z' }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const args: V3 = axis === 'x' ? [length, 0.008, 0.006] : axis === 'y' ? [0.008, length, 0.006] : [0.008, 0.006, length]
  useFrame(() => {
    if (!matRef.current) return
    applyRgb(matRef.current.emissive)
    matRef.current.emissiveIntensity = 0.9
  })
  return (
    <mesh position={pos}>
      <boxGeometry args={args} />
      <meshStandardMaterial ref={matRef} color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} toneMapped={false} />
    </mesh>
  )
}

// ─── AIO tube ────────────────────────────────────────────────────────────────────

function AIOTube({ from, to, ctrl1, ctrl2 }: { from: V3; to: V3; ctrl1: V3; ctrl2: V3 }) {
  const geo = useMemo(() => new TubeGeometry(
    new CatmullRomCurve3([new Vector3(...from), new Vector3(...ctrl1), new Vector3(...ctrl2), new Vector3(...to)]),
    24, 0.013, 12, false), [])
  return <mesh geometry={geo}><MatPlastic color="#0e0e0e" rough={0.55} /></mesh>
}

// ─── Motherboard ──────────────────────────────────────────────────────────────

function Motherboard({ moboId, w, h }: { moboId?: string; w: number; h: number }) {
  const isZ890 = moboId?.includes('z890') ?? false
  const isX670 = moboId?.includes('x670') ?? false
  const isB650 = moboId?.includes('b650') ?? false
  const pcbColor = isZ890 ? '#15100a' : isX670 ? '#0a1408' : isB650 ? '#070710' : '#0a1208'
  const accent = isZ890 ? '#ff6a1a' : isX670 ? '#cc1020' : isB650 ? '#1f6bff' : '#16c24a'
  const pciSlots = isB650 ? 2 : 3

  return (
    <group>
      <RoundedBox args={[w, h, 0.012]} radius={0.006} smoothness={3}><MatPcb color={pcbColor} /></RoundedBox>

      {/* CPU socket */}
      <RoundedBox args={[0.18, 0.18, 0.005]} radius={0.004} smoothness={2} position={[-0.06, h * 0.26, 0.008]}>
        <MatPlastic color="#0d0d0d" rough={0.3} />
      </RoundedBox>
      {Array.from({ length: 10 }).map((_, row) =>
        Array.from({ length: 10 }).map((_, col) => (
          <mesh key={`p${row}-${col}`} position={[-0.102 + col * 0.0095, h * 0.26 - 0.045 + row * 0.0095, 0.012]}>
            <boxGeometry args={[0.004, 0.004, 0.002]} /><MatChrome color="#8a8d92" />
          </mesh>
        ))
      )}
      <mesh position={[-0.06, h * 0.26, 0.011]}><boxGeometry args={[0.2, 0.2, 0.003]} /><meshStandardMaterial color="#2a2a2a" wireframe /></mesh>

      {/* RAM slots ×4 */}
      {[0, 1, 2, 3].map(i => (
        <group key={`rs${i}`} position={[0.19, h * 0.28 - i * 0.052, 0.01]}>
          <RoundedBox args={[0.085, 0.04, 0.018]} radius={0.003} smoothness={2}><MatPlastic color="#161616" rough={0.4} /></RoundedBox>
          <mesh position={[0.046, 0, 0]}><boxGeometry args={[0.008, 0.044, 0.02]} />{i < 2 ? <MatEmis color={accent} intensity={0.5} /> : <MatPlastic color="#2a2a2a" />}</mesh>
          <mesh position={[-0.046, 0, 0]}><boxGeometry args={[0.008, 0.044, 0.02]} />{i < 2 ? <MatEmis color={accent} intensity={0.5} /> : <MatPlastic color="#2a2a2a" />}</mesh>
        </group>
      ))}

      {/* PCIe slots */}
      {Array.from({ length: pciSlots }).map((_, i) => (
        <group key={`pcie${i}`} position={[-0.02, -h * 0.04 - i * 0.085, 0.01]}>
          <RoundedBox args={[0.42, 0.02, 0.016]} radius={0.003} smoothness={2}><MatPlastic color="#0d0d0d" rough={0.35} /></RoundedBox>
          {Array.from({ length: 18 }).map((_, j) => (
            <mesh key={j} position={[-0.15 + j * 0.017, 0, 0.009]}><boxGeometry args={[0.005, 0.016, 0.003]} /><MatGold /></mesh>
          ))}
        </group>
      ))}

      {/* M.2 heatsinks */}
      {[0, 1, 2].map(i => (
        <RoundedBox key={`m2${i}`} args={[0.24, 0.014, 0.008]} radius={0.003} smoothness={2} position={[0.0, -h * 0.02 - i * 0.05, 0.011]}>
          <MatMetal color="#1c1c20" rough={0.32} />
        </RoundedBox>
      ))}

      {/* VRM heatsink */}
      <group position={[-0.06, h * 0.42, 0.02]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} position={[i * 0.016 - 0.05, 0, 0]}><boxGeometry args={[0.011, 0.07, 0.03]} /><MatMetal color="#1c1c1c" rough={0.28} /></mesh>
        ))}
      </group>

      {/* Chipset heatsink */}
      <RoundedBox args={[0.1, 0.09, 0.022]} radius={0.006} smoothness={3} position={[0.12, -h * 0.22, 0.019]}><MatAnodized color="#101010" /></RoundedBox>
      <mesh position={[0.12, -h * 0.22, 0.031]}><boxGeometry args={[0.085, 0.075, 0.002]} /><MatEmis color={accent} intensity={0.45} /></mesh>

      {/* connectors */}
      <RoundedBox args={[0.04, 0.06, 0.025]} radius={0.004} smoothness={2} position={[w / 2 - 0.03, h * 0.18, 0.022]}><MatPlastic color="#1a1a1a" /></RoundedBox>
      <RoundedBox args={[0.05, 0.03, 0.022]} radius={0.004} smoothness={2} position={[-0.06, h / 2 - 0.03, 0.022]}><MatPlastic color="#1a1a1a" /></RoundedBox>
      {[0, 1, 2, 3].map(i => (
        <mesh key={`sata${i}`} position={[w / 2 - 0.02, -h * 0.1 - i * 0.035, 0.018]}><boxGeometry args={[0.022, 0.026, 0.014]} /><MatPlastic color="#222" /></mesh>
      ))}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`fh${i}`} position={[-0.18 + i * 0.06, -h / 2 + 0.03, 0.012]}><boxGeometry args={[0.016, 0.011, 0.01]} /><MatEmis color={accent} intensity={0.35} /></mesh>
      ))}
    </group>
  )
}

// ─── CPU ─────────────────────────────────────────────────────────────────────

function CPU({ cpuId }: { cpuId?: string }) {
  const isAMD = cpuId?.startsWith('amd') ?? false
  const isArrow = cpuId?.includes('ultra') ?? false
  const glow = isAMD ? '#ff4a14' : isArrow ? '#1ab0ff' : '#1a6bff'
  const baseColor = isAMD ? '#160808' : '#080816'
  const dieCount = isArrow ? 3 : 1
  const lightRef = useRef<THREE.PointLight>(null!)
  useFrame(() => { if (lightRef.current) lightRef.current.intensity = 0.3 + Math.sin(Date.now() * 0.0016) * 0.15 })

  return (
    <group>
      <RoundedBox args={[0.16, 0.16, 0.012]} radius={0.004} smoothness={2}><MatPcb color={baseColor} /></RoundedBox>
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <mesh key={`lp${row}-${col}`} position={[-0.05 + col * 0.0143, -0.05 + row * 0.0143, -0.007]}>
            <cylinderGeometry args={[0.0028, 0.0028, 0.004, 8]} /><MatGold />
          </mesh>
        ))
      )}
      {/* nickel-plated IHS */}
      <RoundedBox args={[0.155, 0.155, 0.008]} radius={0.006} smoothness={3} position={[0, 0, 0.009]}><MatChrome color="#b8bcc2" /></RoundedBox>
      {Array.from({ length: dieCount }).map((_, i) => (
        <group key={`die${i}`} position={[(i - (dieCount - 1) / 2) * 0.04, 0, 0.014]}>
          <mesh><boxGeometry args={[0.032, 0.032, 0.003]} /><MatPlastic color="#0d0d0d" rough={0.2} /></mesh>
          {Array.from({ length: 5 }).map((_, t) => (
            <mesh key={t} position={[0, -0.011 + t * 0.0055, 0.002]}><boxGeometry args={[0.026, 0.001, 0.001]} /><MatEmis color={glow} intensity={0.5} /></mesh>
          ))}
        </group>
      ))}
      <pointLight ref={lightRef} color={glow} intensity={0.3} distance={0.5} />
    </group>
  )
}

// ─── CPU cooler ───────────────────────────────────────────────────────────────

function CPUCooler({ coolerId }: { coolerId?: string }) {
  const isAIO = !!(coolerId?.toLowerCase().match(/liquid|aio|freezer|kraken/))
  const isNoctua = coolerId?.includes('noctua') ?? false

  if (isAIO) {
    return (
      <group>
        <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 40]} /><MatAnodized color="#0e0e0e" rough={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.052]}><torusGeometry args={[0.05, 0.009, 16, 40]} /><MatEmis color="#1ab0ff" intensity={0.8} /></mesh>
        <AIOTube from={[0.04, 0.02, 0.03]} ctrl1={[0.1, 0.08, 0.06]} ctrl2={[0.08, 0.16, 0.04]} to={[0.05, 0.2, 0.0]} />
        <AIOTube from={[-0.04, 0.02, 0.03]} ctrl1={[-0.1, 0.08, 0.06]} ctrl2={[-0.08, 0.16, 0.04]} to={[-0.05, 0.2, 0.0]} />
        <group position={[0, 0.24, 0]}>
          <RoundedBox args={[0.3, 0.08, 0.022]} radius={0.004} smoothness={2}><MatMetal color="#1a1a1a" rough={0.3} /></RoundedBox>
          {Array.from({ length: 14 }).map((_, i) => (
            <mesh key={i} position={[-0.13 + i * 0.019, 0, 0]}><boxGeometry args={[0.004, 0.08, 0.02]} /><MatMetal color="#2c2c2c" rough={0.25} /></mesh>
          ))}
          <SpinFan pos={[-0.09, 0, 0.02]} radius={0.04} glowColor="#1a44ff" />
          <SpinFan pos={[0, 0, 0.02]} radius={0.04} glowColor="#1a44ff" />
          <SpinFan pos={[0.09, 0, 0.02]} radius={0.04} glowColor="#1a44ff" />
        </group>
      </group>
    )
  }

  if (isNoctua) {
    return (
      <group>
        {[-0.035, 0.035].map((xOff, ti) => (
          <group key={ti} position={[xOff, 0, 0.06]}>
            {Array.from({ length: 22 }).map((_, i) => (
              <mesh key={i} position={[0, 0, i * 0.0055]}><boxGeometry args={[0.11, 0.13, 0.003]} /><MatMetal color="#cfcfcf" rough={0.3} /></mesh>
            ))}
          </group>
        ))}
        {[-0.03, 0, 0.03].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.006, 0.006, 0.13, 12]} /><MatChrome color="#c0c4ca" /></mesh>
        ))}
        <SpinFan pos={[0, 0, 0.13]} radius={0.06} color="#7a5a3a" glowColor="#a8773a" />
      </group>
    )
  }

  return (
    <group>
      {Array.from({ length: 26 }).map((_, i) => (
        <mesh key={i} position={[0, 0, i * 0.005]}><boxGeometry args={[0.095, 0.11, 0.003]} /><MatMetal color="#5a5a5e" rough={0.28} /></mesh>
      ))}
      <SpinFan pos={[0, 0, 0.1]} radius={0.05} color="#2a2a2a" glowColor="#555" />
    </group>
  )
}

// ─── GPU ──────────────────────────────────────────────────────────────────────

function GPU({ gpuId }: { gpuId?: string }) {
  const is5090 = gpuId?.includes('5090') ?? false
  const is4090 = gpuId?.includes('4090') ?? false
  const is5080 = gpuId?.includes('5080') ?? false
  const fanCount = (is5090 || is4090) ? 3 : 2
  const gpuW = (is5090 || is4090) ? 0.52 : is5080 ? 0.46 : 0.40

  return (
    <group>
      <RoundedBox args={[gpuW, 0.115, 0.012]} radius={0.003} smoothness={2} position={[0, 0, -0.03]}><MatPcb color="#0a0010" /></RoundedBox>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-gpuW / 2 + 0.14 + (i % 4) * 0.05, i < 4 ? 0.028 : -0.028, -0.022]}>
          <boxGeometry args={[0.034, 0.018, 0.004]} /><MatPlastic color="#0a0a1a" rough={0.35} />
        </mesh>
      ))}
      {/* heatsink */}
      <RoundedBox args={[gpuW, 0.118, 0.03]} radius={0.006} smoothness={3} position={[0, 0, -0.006]}><MatAnodized color="#161616" rough={0.34} /></RoundedBox>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={i} position={[-gpuW / 2 + 0.016 + i * (gpuW - 0.03) / 16, 0, -0.006]}><boxGeometry args={[0.005, 0.112, 0.02]} /><MatMetal color="#242424" rough={0.3} /></mesh>
      ))}
      {/* shroud */}
      <RoundedBox args={[gpuW, 0.122, 0.014]} radius={0.008} smoothness={4} position={[0, 0, 0.014]}><MatPlastic color="#0d0d0d" rough={0.4} /></RoundedBox>
      {/* fan recess wells */}
      {Array.from({ length: fanCount }).map((_, i) => {
        const fx = -gpuW / 2 + 0.075 + i * (gpuW - 0.15) / Math.max(fanCount - 1, 1)
        return (
          <group key={i}>
            <mesh position={[fx, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.006, 32]} /><MatPlastic color="#080808" rough={0.5} /></mesh>
            <SpinFan pos={[fx, 0, 0.024]} radius={0.048} blades={11} color="#161616" glowColor="#1a44ff" />
          </group>
        )
      })}
      {/* backplate */}
      <RoundedBox args={[gpuW, 0.118, 0.004]} radius={0.003} smoothness={2} position={[0, 0, -0.038]}><MatMetal color="#0e0e0e" rough={0.22} /></RoundedBox>
      {/* logo bar */}
      <mesh position={[0, 0.05, 0.022]}><boxGeometry args={[gpuW * 0.4, 0.008, 0.001]} /><MatEmis color="#1ab0ff" intensity={0.9} /></mesh>
      {/* 16-pin power */}
      <RoundedBox args={[0.026, 0.014, 0.02]} radius={0.002} smoothness={2} position={[gpuW / 2 - 0.04, 0.062, 0.0]}><MatPlastic color="#141414" /></RoundedBox>
      {/* PCIe tab */}
      <mesh position={[-gpuW / 2 + 0.1, -0.07, -0.03]}><boxGeometry args={[0.12, 0.02, 0.01]} /><MatGold /></mesh>
    </group>
  )
}

// ─── RAM ──────────────────────────────────────────────────────────────────────

function RAM({ ramId }: { ramId?: string }) {
  const isDominator = ramId?.includes('dominator') ?? false
  const isTrident = ramId?.includes('trident') ?? false
  const spreader = isDominator ? '#b8bcc2' : isTrident ? '#cfd3d8' : '#5a5a5e'
  const top = isDominator ? '#d01024' : isTrident ? '#e8e8e8' : '#888'

  return (
    <group>
      {[0, 1].map(i => (
        <group key={i} position={[i === 0 ? -0.026 : 0.026, 0, 0]}>
          <RoundedBox args={[0.013, 0.13, 0.004]} radius={0.002} smoothness={2}><MatPcb color="#0a0010" /></RoundedBox>
          {Array.from({ length: 8 }).map((_, j) => (
            <mesh key={j} position={[0, -0.045 + j * 0.013, 0.003]}><boxGeometry args={[0.01, 0.009, 0.002]} /><MatPlastic color="#141414" rough={0.3} /></mesh>
          ))}
          <RoundedBox args={[0.016, 0.14, 0.009]} radius={0.003} smoothness={3} position={[0, 0.008, 0.0055]}><MatMetal color={spreader} rough={0.26} /></RoundedBox>
          {Array.from({ length: 6 }).map((_, j) => (
            <mesh key={j} position={[-0.005 + j * 0.002, 0.082, 0.006]}><boxGeometry args={[0.0015, 0.012, 0.011]} /><MatMetal color={top} rough={0.3} /></mesh>
          ))}
          <RGBStrip pos={[0, 0.085, 0.012]} length={0.014} axis="x" />
        </group>
      ))}
    </group>
  )
}

// ─── Storage (M.2) ────────────────────────────────────────────────────────────

function Storage({ storageId }: { storageId?: string }) {
  const isSamsung = storageId?.includes('samsung') ?? false
  const isWD = storageId?.includes('wd') ?? false
  const pcbColor = isSamsung ? '#0a1510' : isWD ? '#001020' : '#0a0a15'
  const accent = isSamsung ? '#1a78d8' : isWD ? '#1a98ff' : '#555'

  return (
    <group>
      <RoundedBox args={[0.2, 0.022, 0.004]} radius={0.002} smoothness={2}><MatPcb color={pcbColor} /></RoundedBox>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[-0.06 + i * 0.034, 0, 0.004]}><boxGeometry args={[0.028, 0.016, 0.003]} /><MatPlastic color="#141414" rough={0.32} /></mesh>
      ))}
      <mesh position={[0.07, 0, 0.004]}><boxGeometry args={[0.018, 0.018, 0.004]} /><MatPlastic color="#0d0d0d" rough={0.28} /></mesh>
      <mesh position={[0.04, 0, 0.007]}><boxGeometry args={[0.036, 0.003, 0.001]} /><MatEmis color={accent} intensity={0.5} /></mesh>
      <mesh position={[-0.09, 0, -0.001]}><boxGeometry args={[0.02, 0.016, 0.003]} /><MatGold /></mesh>
    </group>
  )
}

// ─── PSU ──────────────────────────────────────────────────────────────────────

function PSU({ psuId }: { psuId?: string }) {
  const isCorsair = psuId?.includes('corsair') ?? false
  const brand = isCorsair ? '#ffcc1a' : '#9aa0a8'
  return (
    <group>
      <RoundedBox args={[0.34, 0.16, 0.16]} radius={0.01} smoothness={4}><MatAnodized color={isCorsair ? '#0c0c12' : '#0c0c0c'} rough={0.38} /></RoundedBox>
      <mesh position={[0, 0.082, 0]}><cylinderGeometry args={[0.065, 0.065, 0.002, 40]} /><meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} wireframe /></mesh>
      <SpinFan pos={[0, 0.086, 0]} radius={0.06} color="#0d0d0d" glowColor="#444" facing="y+" />
      <RoundedBox args={[0.3, 0.13, 0.006]} radius={0.003} smoothness={2} position={[0, 0, 0.082]}><MatPlastic color="#0d0d0d" /></RoundedBox>
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => (
          <mesh key={`c${row}-${col}`} position={[-0.09 + col * 0.06, -0.04 + row * 0.04, 0.086]}><boxGeometry args={[0.04, 0.026, 0.008]} /><MatPlastic color="#242424" /></mesh>
        ))
      )}
      <mesh position={[-0.17, 0, 0.04]}><boxGeometry args={[0.001, 0.05, 0.06]} /><MatEmis color={brand} intensity={0.4} /></mesh>
    </group>
  )
}

// ─── PSU shroud ───────────────────────────────────────────────────────────────

function PSUShroud({ cfg, layout }: { cfg: CaseCfg; layout: ReturnType<typeof computeLayout> }) {
  const iw = cfg.w - 0.06
  const id = cfg.d - 0.06
  const topY = layout.shroudY + layout.shroudH / 2 + 0.06
  return (
    <group>
      <RoundedBox args={[iw, 0.012, id]} radius={0.004} smoothness={2} position={[-0.02, topY, 0]}><MatAnodized color={cfg.frameColor} rough={0.5} /></RoundedBox>
      <mesh position={[-0.02, topY + 0.008, id / 2 - 0.06]}><boxGeometry args={[iw * 0.7, 0.004, 0.01]} /><MatEmis color={cfg.accentColor} intensity={0.3} /></mesh>
    </group>
  )
}

// ─── Case structure ───────────────────────────────────────────────────────────

function CaseStructure({ cfg }: { cfg: CaseCfg }) {
  const { w, h, d } = cfg
  const Glass = () => (
    <meshPhysicalMaterial color={cfg.glassColor} transparent opacity={cfg.glassOpacity + 0.04} roughness={0.04} metalness={0} clearcoat={1} clearcoatRoughness={0.05} ior={1.5} envMapIntensity={1.4} />
  )
  return (
    <group>
      {/* chassis panels (brushed anodized aluminium) */}
      <RoundedBox args={[w, h, 0.012]} radius={0.008} smoothness={3} position={[0, 0, -d / 2]}><MatAnodized color={cfg.frameColor} rough={0.45} /></RoundedBox>
      <RoundedBox args={[w, 0.012, d]} radius={0.006} smoothness={2} position={[0, -h / 2, 0]}><MatAnodized color={cfg.frameColor} rough={0.5} /></RoundedBox>
      <RoundedBox args={[w, 0.012, d]} radius={0.006} smoothness={2} position={[0, h / 2, 0]}><MatAnodized color={cfg.frameColor} rough={0.4} /></RoundedBox>
      <RoundedBox args={[0.01, h, d]} radius={0.005} smoothness={2} position={[-w / 2, 0, 0]}><MatAnodized color={cfg.frameColor} rough={0.4} /></RoundedBox>

      {/* right panel — glass doesn't intercept clicks so inner parts stay selectable */}
      {cfg.glassPanel !== 'front' ? (
        <mesh position={[w / 2, 0, 0]} raycast={() => null}><boxGeometry args={[0.006, h - 0.02, d - 0.02]} /><Glass /></mesh>
      ) : (
        <RoundedBox args={[0.01, h, d]} radius={0.005} smoothness={2} position={[w / 2, 0, 0]}><MatAnodized color={cfg.frameColor} /></RoundedBox>
      )}
      {/* front panel */}
      {(cfg.glassPanel === 'front' || cfg.glassPanel === 'dual' || cfg.glassPanel === 'full360') ? (
        <mesh position={[0, 0, d / 2]} raycast={() => null}><boxGeometry args={[w - 0.02, h - 0.02, 0.006]} /><Glass /></mesh>
      ) : (
        <RoundedBox args={[w, h, 0.012]} radius={0.008} smoothness={3} position={[0, 0, d / 2]}><MatAnodized color={cfg.frameColor} rough={0.5} /></RoundedBox>
      )}

      {/* front I/O */}
      <RoundedBox args={[0.18, 0.025, 0.012]} radius={0.004} smoothness={2} position={[0, h / 2 - 0.03, d / 2 - 0.01]}><MatPlastic color="#070707" /></RoundedBox>
      {[-0.04, -0.01, 0.02, 0.05].map((x, i) => (
        <mesh key={i} position={[x, h / 2 - 0.03, d / 2 + 0.002]}><boxGeometry args={[0.018, 0.012, 0.004]} /><MatPlastic color="#1a1a1a" /></mesh>
      ))}
      <mesh position={[0.09, h / 2 - 0.03, d / 2 + 0.002]}><cylinderGeometry args={[0.008, 0.008, 0.005, 20]} /><MatEmis color={cfg.accentColor} intensity={0.45} /></mesh>

      {(cfg.id === 'lian-li-o11-dynamic' || cfg.id === 'nzxt-h9-elite') && (
        <RGBStrip pos={[0, 0, d / 2 + 0.006]} length={h * 0.7} axis="y" />
      )}
      {cfg.id === 'corsair-5000d' && (
        <mesh position={[0, h / 2 - 0.005, d / 4]}><boxGeometry args={[w - 0.01, 0.005, 0.005]} /><MatEmis color="#ffcc1a" intensity={0.4} /></mesh>
      )}
      {cfg.id === 'bequiet-silent-base' && [0.3, 0.6].map((t, i) => (
        <mesh key={i} position={[0, -h / 2 + 0.006, -d / 2 + t * d]}><boxGeometry args={[w - 0.02, 0.006, 0.012]} /><MatPlastic color="#2a2a2a" rough={0.9} /></mesh>
      ))}
    </group>
  )
}

// ─── Case fans ────────────────────────────────────────────────────────────────

function CaseFans({ cfg }: { cfg: CaseCfg }) {
  const { w, h, d } = cfg
  const el: JSX.Element[] = []
  for (let i = 0; i < cfg.frontFans; i++) {
    const y = -h * 0.28 + i * h * 0.26
    el.push(<SpinFan key={`ff${i}`} pos={[0, y, d / 2 - 0.03]} radius={0.07} glowColor={cfg.accentColor} facing="z+" />)
    el.push(<FanGrill key={`ffg${i}`} pos={[0, y, d / 2 + 0.006]} radius={0.07} facing="z+" />)
  }
  for (let i = 0; i < cfg.topFans; i++) {
    const x = -w * 0.24 + i * w * 0.24
    el.push(<SpinFan key={`tf${i}`} pos={[x, h / 2 - 0.03, 0]} radius={0.058} glowColor="#1a66ff" facing="y+" />)
    el.push(<FanGrill key={`tfg${i}`} pos={[x, h / 2 + 0.006, 0]} radius={0.058} facing="y+" />)
  }
  for (let i = 0; i < cfg.sideFans; i++) {
    const y = -h * 0.22 + i * h * 0.22
    el.push(<SpinFan key={`sf${i}`} pos={[-w / 2 + 0.03, y, 0]} radius={0.07} glowColor="#1affaa" facing="x-" />)
  }
  for (let i = 0; i < cfg.bottomFans; i++) {
    const x = -w * 0.28 + i * w * 0.2
    el.push(<SpinFan key={`bf${i}`} pos={[x, -h / 2 + 0.03, 0]} radius={0.06} glowColor={cfg.accentColor} facing="y-" />)
    el.push(<FanGrill key={`bfg${i}`} pos={[x, -h / 2 - 0.006, 0]} radius={0.06} facing="y-" color="#1c1c1c" />)
  }
  return <>{el}</>
}

// ─── Selection highlight ──────────────────────────────────────────────────────

function SelectionBox({ size }: { size: V3 }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)
  useFrame(() => { if (matRef.current) matRef.current.opacity = 0.35 + Math.sin(Date.now() * 0.005) * 0.25 })
  return (
    <mesh>
      <boxGeometry args={size} />
      <meshBasicMaterial ref={matRef} color="#C8102E" wireframe transparent opacity={0.4} toneMapped={false} />
    </mesh>
  )
}

// ─── Empty slot label ─────────────────────────────────────────────────────────

function EmptySlotLabel({ pos, label, onClick }: { pos: V3; label: string; onClick?: () => void }) {
  return (
    <group position={pos}>
      <mesh onClick={e => { e.stopPropagation(); onClick?.() }}>
        <boxGeometry args={[0.2, 0.05, 0.04]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.03} wireframe />
      </mesh>
      <Html center>
        <div onClick={onClick} style={{
          color: 'rgba(255,255,255,0.3)', fontSize: '7px', fontFamily: 'monospace',
          padding: '2px 6px', border: '1px dashed rgba(255,255,255,0.18)', borderRadius: '4px',
          background: 'rgba(0,0,0,0.55)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
        }}>+ {label}</div>
      </Html>
    </group>
  )
}

// ─── PCModel export ───────────────────────────────────────────────────────────

interface PCModelProps {
  build: Build
  selectedPart?: string | null
  onPartClick?: (cat: string) => void
  explode?: number
}

export function PCModel({ build, selectedPart, onPartClick, explode = 0 }: PCModelProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const cfg = getCaseCfg(build.case?.id)
  const layout = useMemo(() => computeLayout(cfg), [cfg])

  const [mountKey, setMountKey] = useState(0)
  const prevCaseId = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (build.case?.id !== prevCaseId.current) {
      prevCaseId.current = build.case?.id
      setMountKey(k => k + 1)
    }
  }, [build.case?.id])

  // Slow turntable showcase rotation (pauses while a part is selected).
  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (!selectedPart) groupRef.current.rotation.y += delta * 0.045
    modelState.rotationY = groupRef.current.rotation.y
  })

  const click = (cat: string) => (e: { stopPropagation: () => void }) => { e.stopPropagation(); onPartClick?.(cat) }

  return (
    <group ref={groupRef} key={mountKey}>
      {/* Case is left-clickable (solid frame panels) to select/inspect it */}
      <group onClick={click('case')}>
        <CaseStructure cfg={cfg} />
        {selectedPart === 'case' && build.case && (
          <SelectionBox size={[cfg.w + 0.02, cfg.h + 0.02, cfg.d + 0.02]} />
        )}
      </group>
      <CaseFans cfg={cfg} />
      <PSUShroud cfg={cfg} layout={layout} />

      {/* Motherboard */}
      <group position={layout.mobo.pos} onClick={click('motherboard')}>
        <Exploded part="motherboard" amount={explode}>
          <Installable signature={build.motherboard?.id ?? 'empty'}>
            <GLTFPart category="motherboard" partId={build.motherboard?.id}>
              <Motherboard moboId={build.motherboard?.id} w={layout.mobo.w} h={layout.mobo.h} />
            </GLTFPart>
          </Installable>
          {selectedPart === 'motherboard' && <SelectionBox size={[layout.mobo.w + 0.04, layout.mobo.h + 0.04, 0.06]} />}
        </Exploded>
      </group>

      {/* CPU */}
      {build.cpu ? (
        <group position={layout.cpu} onClick={click('cpu')}>
          <Exploded part="cpu" amount={explode}>
            <Installable signature={build.cpu.id} delay={0.05}>
              <GLTFPart category="cpu" partId={build.cpu.id}><CPU cpuId={build.cpu.id} /></GLTFPart>
            </Installable>
            {selectedPart === 'cpu' && <SelectionBox size={[0.19, 0.19, 0.08]} />}
          </Exploded>
        </group>
      ) : <EmptySlotLabel pos={layout.cpu} label="CPU" onClick={() => onPartClick?.('cpu')} />}

      {/* Cooler */}
      {build.cooling ? (
        <group position={layout.cooler} onClick={click('cooling')}>
          <Exploded part="cooling" amount={explode}>
            <Installable signature={build.cooling.id} delay={0.12}>
              <GLTFPart category="cooling" partId={build.cooling.id}><CPUCooler coolerId={build.cooling.id} /></GLTFPart>
            </Installable>
            {selectedPart === 'cooling' && <SelectionBox size={[0.16, 0.34, 0.2]} />}
          </Exploded>
        </group>
      ) : (build.cpu && <EmptySlotLabel pos={[layout.cooler[0], layout.cooler[1] + 0.12, layout.cooler[2]]} label="Cooler" onClick={() => onPartClick?.('cooling')} />)}

      {/* RAM */}
      {build.ram ? (
        <group position={layout.ram} onClick={click('ram')}>
          <Exploded part="ram" amount={explode}>
            <Installable signature={build.ram.id} delay={0.18}>
              <GLTFPart category="ram" partId={build.ram.id}><RAM ramId={build.ram.id} /></GLTFPart>
            </Installable>
            {selectedPart === 'ram' && <SelectionBox size={[0.09, 0.17, 0.04]} />}
          </Exploded>
        </group>
      ) : <EmptySlotLabel pos={layout.ram} label="RAM" onClick={() => onPartClick?.('ram')} />}

      {/* Storage */}
      {build.storage ? (
        <group position={layout.storage} onClick={click('storage')}>
          <Exploded part="storage" amount={explode}>
            <Installable signature={build.storage.id} delay={0.22}>
              <GLTFPart category="storage" partId={build.storage.id}><Storage storageId={build.storage.id} /></GLTFPart>
            </Installable>
            {selectedPart === 'storage' && <SelectionBox size={[0.22, 0.03, 0.012]} />}
          </Exploded>
        </group>
      ) : <EmptySlotLabel pos={layout.storage} label="M.2 SSD" onClick={() => onPartClick?.('storage')} />}

      {/* GPU */}
      {build.gpu ? (
        <group position={layout.gpu} onClick={click('gpu')}>
          <Exploded part="gpu" amount={explode}>
            <Installable signature={build.gpu.id} delay={0.1}>
              <GLTFPart category="gpu" partId={build.gpu.id}><GPU gpuId={build.gpu.id} /></GLTFPart>
            </Installable>
            {selectedPart === 'gpu' && <SelectionBox size={[0.56, 0.14, 0.1]} />}
          </Exploded>
        </group>
      ) : <EmptySlotLabel pos={layout.gpu} label="GPU" onClick={() => onPartClick?.('gpu')} />}

      {/* PSU */}
      {build.psu ? (
        <group position={layout.psu} onClick={click('psu')}>
          <Exploded part="psu" amount={explode}>
            <Installable signature={build.psu.id} delay={0.26}>
              <GLTFPart category="psu" partId={build.psu.id}><PSU psuId={build.psu.id} /></GLTFPart>
            </Installable>
            {selectedPart === 'psu' && <SelectionBox size={[0.36, 0.18, 0.18]} />}
          </Exploded>
        </group>
      ) : <EmptySlotLabel pos={layout.psu} label="PSU" onClick={() => onPartClick?.('psu')} />}
    </group>
  )
}
