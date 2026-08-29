import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sparkles, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import SimulationSidebar from './SimulationSidebar'
import HandGestureControl, { advanceGesture } from './HandGestureControl'
import { computeHaloSeries } from './haloModels'
import './GalaxySimulation.css'
import SimHomeButton from '../../site/SimHomeButton'

/* Procedural particle buffers: Math.random is intentional one-shot noise in useMemo. */
/* eslint-disable react-hooks/purity */

// Light-ray lensing constants
const KPC_TO_SCENE = 18 / 42        // kpc → Three.js scene units
const LR_G = 4.3009e-6              // kpc (km/s)² / M☉
const LR_C = 299792.458             // km/s
const LR_B_KPC = 8                  // impact parameter (kpc)
const LR_XMAX = 23                  // half-length of ray in scene units
const LR_VIS = 5e4                  // visual exaggeration of α so bending is visible

function createSoftCircleTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const center = size / 2
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)')
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.08)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/** Approximate DM density glow in scene units (~18 ≈ outer disk). */
function DarkMatterGlow({ visible, densityFactor, scaleRadiusKpc }) {
  if (!visible) return null

  const kpcToScene = 18 / 42
  const rs = Math.max(scaleRadiusKpc * kpcToScene, 1.15)
  const br = Math.min(Math.max(densityFactor, 0.2), 5)
  const strengths = [0.11, 0.075, 0.052, 0.036].map((s) => s * (0.55 + br * 0.22))

  const radii = [rs * 0.72, rs * 1.15, rs * 1.85, rs * 2.55]

  return (
    <group rotation={[Math.PI / 2, 0, 0]} renderOrder={-8}>
      {radii.map((rad, i) => (
        <mesh key={`dm-${i}`} renderOrder={-8}>
          <circleGeometry args={[rad, 72]} />
          <meshBasicMaterial
            color="#1166ee"
            transparent
            opacity={strengths[i] ?? strengths[strengths.length - 1]}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

function DarkMatterHalo({ visible, densityFactor, scaleRadiusKpc, model, velocityScale }) {
  const pointsRef = useRef()
  const materialRef = useRef()
  const [opacity, setOpacity] = useState(0)

  // Convert kpc to scene units (18 scene units = 42 kpc)
  const kpcToScene = 18 / 42

  const { positions, colors } = useMemo(() => {
    const count = 7000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const rs = scaleRadiusKpc * kpcToScene
    const rMax = 28

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Fibonacci sphere for even angular coverage
      const phi = Math.acos(1 - 2 * (i / count))
      const theta = Math.PI * 2 * i * 1.618

      // Sample radius weighted by actual density profile
      // Rejection sample: pick r, accept with probability proportional to rho(r)
      let r, accepted = false
      let attempts = 0
      while (!accepted && attempts < 80) {
        attempts++
        r = 2 + Math.random() * (rMax - 2)
        const rKpc = r / kpcToScene

        let rho
        if (model === 'nfw') {
          // NFW: rho ~ 1 / (r/rs * (1 + r/rs)^2)
          const x = rKpc / scaleRadiusKpc
          rho = 1 / (x * Math.pow(1 + x, 2))
        } else {
          // ISO: rho ~ 1 / (1 + (r/rc)^2)
          const x = rKpc / scaleRadiusKpc
          rho = 1 / (1 + x * x)
        }

        // Normalize — NFW and ISO max at small r
        const rhoMax = model === 'nfw'
          ? 1 / ((2 / scaleRadiusKpc) * Math.pow(1 + 2 / scaleRadiusKpc, 2))
          : 1.0

        const acceptProb = Math.min(rho / rhoMax, 1.0)
        if (Math.random() < acceptProb * 0.85) accepted = true
      }
      if (!accepted) r = rs + Math.random() * 6

      positions[i3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.cos(phi)
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      // Color encodes local density — brighter/redder = denser
      const rKpc = r / kpcToScene
      let densityT
      if (model === 'nfw') {
        const x = rKpc / scaleRadiusKpc
        const rho = 1 / (x * Math.pow(1 + x, 2))
        const rhoCenter = 1 / ((0.1 / scaleRadiusKpc) * Math.pow(1 + 0.1 / scaleRadiusKpc, 2))
        densityT = Math.min(rho / rhoCenter, 1.0)
      } else {
        const x = rKpc / scaleRadiusKpc
        densityT = 1 / (1 + x * x)
      }

      const color = new THREE.Color()
      // NFW: red-pink core fading to violet (steep cusp)
      // ISO: more uniform violet-pink (flat core)
      if (model === 'nfw') {
        color.setHSL(0.60 - densityT * 0.05, 0.92, 0.35 + densityT * 0.38)
      } else {
        color.setHSL(0.58 + densityT * 0.05, 0.88, 0.42 + densityT * 0.22)
      }
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    return { positions, colors }
  }, [model, scaleRadiusKpc, kpcToScene])

  useFrame((_, delta) => {
    const target = visible ? 1 : 0
    setOpacity((prev) => {
      const next = prev + (target - prev) * delta * 2.5
      return Math.abs(next - target) < 0.001 ? target : next
    })

    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.008
      pointsRef.current.rotation.x += delta * 0.003
    }

    if (materialRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.0008) * 0.15
      const densityBoost = Math.min(Math.max(densityFactor, 0.2), 5)
      const speedMod = Math.min(Math.max(velocityScale, 0.65), 1.35)
      materialRef.current.size = 0.085 * pulse * densityBoost * 0.5 * speedMod
      materialRef.current.opacity = opacity * 0.75 * densityBoost * 0.55
    }
  })

  if (opacity < 0.001) return null

  return (
    <points ref={pointsRef} renderOrder={-10}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.085}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/**
 * Gravitational lensing light ray. Uses GR deflection α = 4GM/(c²b) (exaggerated).
 * The ray enters from the left, curves toward the galactic centre, exits right.
 * Deflection profile follows a Lorentzian centred on the galaxy — matches how
 * projected mass accumulates along the line of sight.
 */
function LightRay({ visible, mencMsun, scaleRadiusKpc }) {
  const [t, setT] = useState(0)

  const bScene = LR_B_KPC * KPC_TO_SCENE

  // Physical GR deflection angle, then converted to a visual y-offset
  const alphaRad = (4 * LR_G * mencMsun) / (LR_C ** 2 * LR_B_KPC)
  const deflectY = Math.min(alphaRad * LR_VIS * LR_XMAX * 2, 18)

  const geos = useMemo(() => {
    const rsScene = Math.max(scaleRadiusKpc * KPC_TO_SCENE, 1.5)
    const pts = Array.from({ length: 120 }, (_, i) => {
      const x = -LR_XMAX + (i / 119) * 2 * LR_XMAX
      // Lorentzian cumulative fraction: 0 at left edge → 1 at right edge
      const frac = Math.atan(x / rsScene) / Math.PI + 0.5
      const y = bScene - deflectY * frac
      return new THREE.Vector3(x, y, 0)
    })
    const crv = new THREE.CatmullRomCurve3(pts)
    return {
      core:  new THREE.TubeGeometry(crv, 240, 0.055, 7, false),
      mid:   new THREE.TubeGeometry(crv, 160, 0.20,  8, false),
      outer: new THREE.TubeGeometry(crv, 100, 0.58,  8, false),
    }
  }, [deflectY, scaleRadiusKpc, bScene])

  useEffect(() => () => { Object.values(geos).forEach(g => g.dispose()) }, [geos])

  useFrame((_, d) => setT(prev => {
    const target = visible ? 1 : 0
    const next = prev + (target - prev) * d * 3
    return Math.abs(next - target) < 0.001 ? target : next
  }))

  if (t < 0.005 && !visible) return null

  return (
    <>
      {/* Atmospheric halo */}
      <mesh geometry={geos.outer} renderOrder={4}>
        <meshBasicMaterial color="#2255ee" transparent opacity={0.07 * t} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Mid glow */}
      <mesh geometry={geos.mid} renderOrder={5}>
        <meshBasicMaterial color="#88ccff" transparent opacity={0.50 * t} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Bright core */}
      <mesh geometry={geos.core} renderOrder={6}>
        <meshBasicMaterial color="#ffffff" transparent opacity={1.0 * t} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  )
}

function GalaxyParticles({ showDM, densityFactor, scaleRadiusKpc,model, velocityScale }) {
  const points = useRef()
  const corePoints = useRef()
  const dustPoints = useRef()
  const circleTexture = useMemo(() => createSoftCircleTexture(), [])

  const { positions, colors } = useMemo(() => {
    const count = 18000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = Math.pow(Math.random(), 0.42) * 18
      const spinAngle = radius * 4.2
      const branchAngle = ((i % 4) / 4) * Math.PI * 2
      const scatterXZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 2.0
      const scatterY = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * (1.8 - radius / 18 * 1.2)

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + scatterXZ
      positions[i3 + 1] = scatterY
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + scatterXZ

      const color = new THREE.Color()
      const t = radius / 18
      if (t < 0.08) {
        color.setRGB(1.0, 1.0, 1.0)
      } else if (t < 0.15) {
        color.setRGB(1.0, 0.98, 0.96)
      } else if (t < 0.25) {
        color.setHSL(0.78, 0.4, 1.0)
      } else if (t < 0.72) {
        const brightness = 0.97 - (t - 0.25) * 0.045
        color.setHSL(0.75 + Math.random() * 0.05, 0.92, brightness + Math.random() * 0.07)
      } else {
        const edge = (t - 0.72) / 0.28
        color.setHSL(0.74 + Math.random() * 0.06, 0.92 - edge * 0.38, 0.94 + Math.random() * 0.05 - edge * 0.02)
      }
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    return { positions, colors }
  }, [])

  const { positions: corePos, colors: coreCol } = useMemo(() => {
    const count = 5000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 1.6) * 4.5
      const theta = Math.random() * Math.PI * 2
      const phi = (Math.random() - 0.5) * Math.PI * 0.5
      positions[i3] = r * Math.cos(theta) * Math.cos(phi)
      positions[i3 + 1] = r * Math.sin(phi) * 0.6
      positions[i3 + 2] = r * Math.sin(theta) * Math.cos(phi)
      const color = new THREE.Color()
      const t = r / 4.5
      if (t < 0.2) {
        color.setRGB(1.0, 1.0, 1.0)
      } else if (t < 0.35) {
        color.setRGB(1.0, 0.98, 0.92)
      } else if (t < 0.6) {
        color.setRGB(1.0, 0.92 - t * 0.1, 0.82 - t * 0.15)
      } else {
        color.setHSL(0.77, 0.8, 0.88 - t * 0.08)
      }
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    return { positions, colors }
  }, [])

  const { positions: dustPos, colors: dustCol } = useMemo(() => {
    const count = 3600
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const arm = i % 2
      const armOffset = (arm / 2) * Math.PI * 2
      const inInner = Math.random() < 0.5
      const radius = inInner ? 4.5 + Math.random() * 4.5 : 11.5 + Math.random() * 5.0
      const spiralAngle = armOffset + radius * 1.1
      const radialScatter = (Math.random() - 0.5) * 0.8
      const tangentialScatter = (Math.random() - 0.5) * 0.3
      const angle = spiralAngle + tangentialScatter

      positions[i3] = Math.cos(angle) * (radius + radialScatter)
      positions[i3 + 1] = (Math.random() - 0.5) * 0.2
      positions[i3 + 2] = Math.sin(angle) * (radius + radialScatter)

      const color = new THREE.Color()
      color.setHSL(0.76 + Math.random() * 0.04, 0.62 + Math.random() * 0.18, 0.52 + Math.random() * 0.14)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    return { positions, colors }
  }, [])

  useFrame((_, delta) => {
    const speedMod = Math.min(Math.max(velocityScale, 0.65), 1.35)
    points.current.rotation.y += delta * 0.04 * speedMod
    corePoints.current.rotation.y += delta * 0.05 * speedMod
    dustPoints.current.rotation.y += delta * 0.032 * speedMod
  })

  return (
    <>
      <DarkMatterGlow visible={showDM} densityFactor={densityFactor} scaleRadiusKpc={scaleRadiusKpc} />
      <DarkMatterHalo
  visible={showDM}
  densityFactor={densityFactor}
  scaleRadiusKpc={scaleRadiusKpc}
  model={model}
  velocityScale={velocityScale}
/>
      <points ref={points} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.076}
          vertexColors
          sizeAttenuation
          transparent
          opacity={1.0}
          map={circleTexture}
          alphaMap={circleTexture}
          alphaTest={0.001}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={corePoints} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[corePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[coreCol, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.11}
          vertexColors
          sizeAttenuation
          transparent
          opacity={1.0}
          map={circleTexture}
          alphaMap={circleTexture}
          alphaTest={0.001}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={dustPoints} renderOrder={0}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[dustCol, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.3}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.15}
          map={circleTexture}
          alphaMap={circleTexture}
          alphaTest={0.001}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-4}>
        <circleGeometry args={[0.25, 64]} />
        <meshBasicMaterial color="#e0eeff" transparent opacity={1.0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-4}>
        <circleGeometry args={[0.9, 64]} />
        <meshBasicMaterial color="#aaccff" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-4}>
        <circleGeometry args={[2.2, 64]} />
        <meshBasicMaterial color="#5599ff" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-4}>
        <circleGeometry args={[4.2, 64]} />
        <meshBasicMaterial color="#2255cc" transparent opacity={0.07} depthWrite={false} />
      </mesh>

      <Sparkles count={700} scale={65} size={0.7} speed={0} color="#2266ff" opacity={0.42} />
    </>
  )
}

// 3D rotation-curve overlay — layout constants
const RC_R_MAX = 45      // kpc
const RC_V_MAX = 400     // km/s
const RC_W = 18          // scene units X — reaches galaxy visual edge
const RC_H = 18          // scene units Y — velocity axis height
const RC_D = 5           // scene units Z — octant depth
const RC_SR = RC_W / RC_R_MAX

// Power-law Y scale: spreads out low velocities so the predicted curve
// sits visibly above zero instead of being compressed at the bottom.
// Exponent 0.62: expands the 0-100 km/s region, compresses 200-400 km/s.
const ySc = (v) => Math.pow(Math.max(v, 0) / RC_V_MAX, 0.62) * RC_H

// Velocity levels used for the back-wall grid lines (non-linear spacing)
const V_GRID = [0, 50, 100, 150, 200, 250, 300, 350, 400]

function RotationCurveOverlay({ visible, series, massFactor = 1 }) {
  const tRef = useRef(0)
  const lastTRef = useRef(-1)
  const [t, setT] = useState(0)

  // ── Imperative Three.js objects (built once) ─────────────────────────────
  const imperObj = useMemo(() => {
    const pm = (color, op) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })

    // Octant face planes
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(RC_W, RC_H), pm(0x05082e, 0.22))
    bw.position.set(RC_W / 2, RC_H / 2, 0)

    const fl = new THREE.Mesh(new THREE.PlaneGeometry(RC_W, RC_D), pm(0x020510, 0.13))
    fl.rotation.x = -Math.PI / 2
    fl.position.set(RC_W / 2, 0, -RC_D / 2)

    const sw = new THREE.Mesh(new THREE.PlaneGeometry(RC_D, RC_H), pm(0x05082e, 0.09))
    sw.rotation.y = Math.PI / 2
    sw.position.set(0, RC_H / 2, -RC_D / 2)

    // Grid — back-wall horizontal lines follow ySc, vertical lines linear
    const gPts = []
    const seg = (ax, ay, az, bx, by, bz) =>
      gPts.push(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz))

    // Back-wall vertical lines (radius axis — linear)
    for (let i = 0; i <= 5; i++) {
      const x = (i / 5) * RC_W
      seg(x, 0, 0, x, RC_H, 0)
    }
    // Back-wall horizontal lines (velocity axis — non-linear via ySc)
    V_GRID.forEach(v => {
      const y = ySc(v)
      seg(0, y, 0, RC_W, y, 0)
    })
    // Floor grid
    for (let i = 0; i <= 5; i++) {
      const x = (i / 5) * RC_W
      const z = -(i / 5) * RC_D
      seg(x, 0, 0, x, 0, -RC_D)
      seg(0, 0, z, RC_W, 0, z)
    }

    const gridMat = new THREE.LineBasicMaterial({ color: 0x2030aa, transparent: true, opacity: 0.38, depthWrite: false })
    const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gPts), gridMat)

    // Axes + tick marks
    const aPts = []
    const ts = 0.28
    aPts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(RC_W + 1.0, 0, 0))
    aPts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, RC_H + 1.0, 0))
    aPts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -(RC_D + 0.6)))
    ;[10, 20, 30, 40].forEach(r => {
      const x = r * RC_SR
      aPts.push(new THREE.Vector3(x, -ts, 0), new THREE.Vector3(x, ts, 0))
    })
    // Velocity ticks at non-linear positions
    ;[50, 100, 150, 200, 250, 300, 350].forEach(v => {
      const y = ySc(v)
      aPts.push(new THREE.Vector3(-ts, y, 0), new THREE.Vector3(ts, y, 0))
    })
    const axisMat = new THREE.LineBasicMaterial({ color: 0x99aaee, transparent: true, opacity: 0.95, depthWrite: false })
    const axes = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(aPts), axisMat)

    return {
      objects: [bw, fl, sw, grid, axes],
      planeMats: [bw.material, fl.material, sw.material],
      planeBase: [0.22, 0.13, 0.09],
      gridMat, axisMat,
    }
  }, [])

  // ── Curve points — rebuilt when series (sliders) or massFactor changes ───
  const { modelPts, mwPts } = useMemo(() => {
    if (!series?.rKpc?.length) return { modelPts: [], mwPts: [] }
    // Baryonic-only curve (peaks then Keplerian decline) as the "predicted" line
    const baryV = series.vcBaryonKms ?? series.vcKms
    // Observed flat curve scales with sqrt(massFactor) so it responds to slider
    const mwScale = Math.sqrt(Math.max(massFactor, 0.01))
    return {
      modelPts: series.rKpc.map((r, i) => [r * RC_SR, ySc(baryV[i]), 0]),
      mwPts:    series.rKpc.map((r, i) => [r * RC_SR, ySc(series.mwVcircKms[i] * mwScale), 0]),
    }
  }, [series, massFactor])

  // ── Opacity animation ─────────────────────────────────────────────────────
  useFrame((_, delta) => {
    tRef.current += ((visible ? 1 : 0) - tRef.current) * Math.min(delta * 3, 1)
    const v = tRef.current
    imperObj.planeMats.forEach((m, i) => { m.opacity = imperObj.planeBase[i] * v })
    imperObj.gridMat.opacity = 0.38 * v
    imperObj.axisMat.opacity = 0.95 * v
    const rounded = Math.round(v * 40) / 40
    if (rounded !== lastTRef.current) { lastTRef.current = rounded; setT(v) }
  })

  if (t < 0.005 && !visible) return null

  const labelOpacity = t > 0.25 ? Math.min(1, (t - 0.25) / 0.35) : 0
  const lbl = (extra = {}) => ({
    userSelect: 'none', pointerEvents: 'none',
    fontFamily: 'ui-sans-serif,system-ui,sans-serif',
    fontWeight: 700, opacity: labelOpacity, whiteSpace: 'nowrap',
    ...extra,
  })

  const modelEndY = modelPts.length > 1 ? modelPts[modelPts.length - 1][1] : 0
  const mwEndY    = mwPts.length    > 1 ? mwPts[mwPts.length - 1][1]       : RC_H

  return (
    <group position={[0, 0.4, 0]}>
      {imperObj.objects.map((o, i) => <primitive key={i} object={o} />)}

      {/* Data curves — thick, via drei Line which supports real lineWidth */}
      {modelPts.length > 1 && (
        <Line points={modelPts} color="#cc44ff" lineWidth={8} transparent opacity={t} />
      )}
      {mwPts.length > 1 && (
        <Line points={mwPts} color="#6655ee" lineWidth={8} transparent opacity={t} />
      )}

      {labelOpacity > 0 && (
        <>
          {/* Axis labels */}
          <Html position={[RC_W / 2, -1.5, 0]} center occlude={false}>
            <span style={lbl({ fontSize: 14, letterSpacing: '0.09em', color: '#aabbee' })}>RADIUS (kpc)</span>
          </Html>
          <Html position={[-1.4, RC_H / 2, 0]} center occlude={false}>
            <span style={lbl({ fontSize: 14, letterSpacing: '0.09em', color: '#aabbee', transform: 'rotate(-90deg)', display: 'block' })}>VELOCITY (km/s)</span>
          </Html>

          {/* Radius tick labels */}
          {[10, 20, 30, 40].map(r => (
            <Html key={`r${r}`} position={[r * RC_SR, -0.8, 0]} center occlude={false}>
              <span style={lbl({ fontSize: 13, fontFamily: 'ui-monospace,monospace', color: '#8899cc' })}>{r}</span>
            </Html>
          ))}

          {/* Velocity tick labels — positioned at non-linear ySc heights */}
          {[100, 200, 300].map(v => (
            <Html key={`v${v}`} position={[-0.85, ySc(v), 0]} center occlude={false}>
              <span style={lbl({ fontSize: 13, fontFamily: 'ui-monospace,monospace', color: '#8899cc' })}>{v}</span>
            </Html>
          ))}

          {/* Curve-end labels */}
          <Html position={[RC_W + 0.4, mwEndY, 0]} center={false} occlude={false}>
            <span style={lbl({ fontSize: 13, color: '#9988ff', letterSpacing: '0.05em' })}>← OBSERVED</span>
          </Html>
          <Html position={[RC_W + 0.4, modelEndY, 0]} center={false} occlude={false}>
            <span style={lbl({ fontSize: 13, color: '#dd66ff', letterSpacing: '0.05em' })}>← BARYONIC</span>
          </Html>
        </>
      )}
    </group>
  )
}

function SimTypeBar({ onSwitchSim }) {
  return (
    <div className="sim-type-bar">
      <SimHomeButton onSwitchSim={onSwitchSim} />
      <button type="button" className="sim-type-tab sim-type-tab-active">
        <span className="sim-type-icon">◉</span>
        Dark Matter
      </button>
      <button
        type="button"
        className="sim-type-tab"
        onClick={() => onSwitchSim?.('blackHole')}
      >
        <span className="sim-type-icon">⬡</span>
        Kerr Black Hole
      </button>
      <button
        type="button"
        className="sim-type-tab"
        onClick={() => onSwitchSim?.('neutronStar')}
      >
        <span className="sim-type-icon">✦</span>
        Neutron Star
      </button>
      <button
        type="button"
        className="sim-type-tab"
        onClick={() => onSwitchSim?.('wormhole')}
      >
        <span className="sim-type-icon">◯</span>
        Wormhole
      </button>
    </div>
  )
}

function GalaxyViewportChrome({ showDM, onToggleDM }) {
  return (
    <label className="galaxy-dm-toggle">
      <input type="checkbox" checked={showDM} onChange={(e) => onToggleDM(e.target.checked)} />
      Show dark matter
    </label>
  )
}

// Drives the galaxy group's rotation and uniform scale from the gesture state.
// While a hand is present it low-pass tracks the targets; when the hand leaves
// the frame the galaxy conserves its angular momentum and coasts to a smooth
// stop instead of snapping back. Disabling gestures eases it to its rest pose.
function GestureApply({ gestureRef, groupRef, enabled }) {
  useFrame(() => {
    const g = gestureRef.current
    const obj = groupRef.current
    if (!g || !obj) return
    advanceGesture(g, enabled)
    obj.rotation.x = g.curRotX
    obj.rotation.y = g.curRotY
    obj.scale.setScalar(g.curScale)
  })
  return null
}

export default function Galaxy({ onSwitchSim }) {
  const [activeTab, setActiveTab] = useState('Simulate')
  const [model, setModel] = useState('nfw')
  const [densityFactor, setDensityFactor] = useState(2.5)
  const [scaleRadiusKpc, setScaleRadiusKpc] = useState(15)
  const [velocityScale, setVelocityScale] = useState(1)
  const [showDM, setShowDM] = useState(true)
  const [showRotationCurve, setShowRotationCurve] = useState(false)
  const [showLightRay, setShowLightRay] = useState(false)
  const [rcMassFactor, setRcMassFactor] = useState(2.0)
  const [rcScaleKpc, setRcScaleKpc] = useState(15)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [gestureEnabled, setGestureEnabled] = useState(false)
  const galaxyGroupRef = useRef(null)
  const gestureRef = useRef({
    targetRotX: 0, targetRotY: 0, targetScale: 1,
    curRotX: 0,    curRotY: 0,    curScale: 1,
    velRotX: 0,    velRotY: 0,    handPresent: false,
  })

  const reopenSidebar = () => setSidebarOpen(true)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSidebarOpen(true)
  }

  const series = useMemo(
    () =>
      computeHaloSeries(model, {
        densityFactor,
        scaleRadiusKpc,
        velocityScale,
      }),
    [model, densityFactor, scaleRadiusKpc, velocityScale]
  )

  const rcSeries = useMemo(
    () =>
      computeHaloSeries(model, {
        densityFactor: rcMassFactor,
        scaleRadiusKpc: rcScaleKpc,
        velocityScale: 1.0,
        rMinKpc: 0.8,
        rMaxKpc: RC_R_MAX,
        nPoints: 80,
      }),
    [model, rcMassFactor, rcScaleKpc]
  )

  return (
    <div className="galaxy-sim">
      <div className="galaxy-sim-viewport">
      <Canvas
  style={{ background: '#00000a', width: '100%', height: '100%', touchAction: 'none' }}
  camera={{ position: [0, 7, 42], fov: 50 }}
  gl={{ antialias: true }}
>
<group ref={galaxyGroupRef}>
  <GalaxyParticles
    showDM={showDM}
    densityFactor={densityFactor}
    scaleRadiusKpc={scaleRadiusKpc}
    model={model}
    velocityScale={velocityScale}
  />
  <RotationCurveOverlay visible={showRotationCurve} series={rcSeries} massFactor={rcMassFactor} />
  <LightRay
    visible={showLightRay}
    mencMsun={rcSeries.mencOuterMsun}
    scaleRadiusKpc={rcScaleKpc}
  />
</group>
<GestureApply gestureRef={gestureRef} groupRef={galaxyGroupRef} enabled={gestureEnabled} />
          <OrbitControls
  makeDefault
  enablePan
  enableZoom
  enableRotate
  screenSpacePanning
  minDistance={4}
  maxDistance={85}
  zoomSpeed={0.85}
  panSpeed={0.65}
  rotateSpeed={0.65}
/>
        </Canvas>
        <SimTypeBar onSwitchSim={onSwitchSim} />
        <GalaxyViewportChrome showDM={showDM} onToggleDM={setShowDM} />
        <HandGestureControl
          enabled={gestureEnabled}
          onToggle={() => setGestureEnabled((v) => !v)}
          gestureRef={gestureRef}
        />
        {!sidebarOpen ? (
          <button type="button" className="galaxy-sim-reopen" onClick={reopenSidebar}>
            Controls
          </button>
        ) : null}
      </div>

      {sidebarOpen ? (
        <div className="galaxy-sim-sidebar-shell">
          <SimulationSidebar
            activeTab={activeTab}
            collapsed={false}
            onTabChange={handleTabChange}
            onClose={() => setSidebarOpen(false)}
            model={model}
            onModelChange={setModel}
            densityFactor={densityFactor}
            onDensityFactorChange={setDensityFactor}
            scaleRadiusKpc={scaleRadiusKpc}
            onScaleRadiusChange={setScaleRadiusKpc}
            velocityScale={velocityScale}
            onVelocityScaleChange={setVelocityScale}
            series={series}
            showRotationCurve={showRotationCurve}
            onToggleRotationCurve={setShowRotationCurve}
            rcMassFactor={rcMassFactor}
            onRcMassFactorChange={setRcMassFactor}
            rcScaleKpc={rcScaleKpc}
            onRcScaleKpcChange={setRcScaleKpc}
            showLightRay={showLightRay}
            onToggleLightRay={setShowLightRay}
          />
        </div>
      ) : null}
    </div>
  )
}
