import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import {
  CurveCard, MainCamera, Glow, InsetFrame, SCENERY, Sightline, StarBody, StarsBackdrop, TelescopeInset,
} from '../shared/StellarScene'
import { drawCurve, makeNoise, useCurveCanvas } from '../shared/lightCurve'
import '../shared/simBase.css'
import {
  relativeFlux, geometricDepth, durationFraction, separation,
} from './transit'

const ACCENT = '#6ee7b7'
const BINS = 150
const MODEL_SAMPLES = 220

const INTRO = [
  { title: 'What am I looking at?', body: 'A planet on a circular orbit around its star, drawn to scale in stellar radii. The inset is what a telescope at the end of the dashed sightline sees, and the card below is the brightness it records.' },
  { title: 'Why does it only dip sometimes?', body: 'A transit needs the planet to pass through the faint column between the star and the telescope. Tilt the orbit far enough and it misses entirely, which is why only a few percent of planetary systems transit.' },
  { title: 'Why is the star darker at the edge?', body: 'Near the limb you look through slanted, higher and cooler layers of the photosphere. That limb darkening gives the dip its rounded floor. Orbit the camera and the dark edge follows your view, because it is computed per viewing angle.' },
  { title: 'What can I change?', body: 'Radius ratio sets the depth, impact parameter tilts the orbit so the chord slides from central to grazing, orbit size sets the duration, and noise adds the scatter a real photometer measures. The clock runs in slow motion during transit so you can watch it.' },
]

const PHYSICS = [
  { title: 'Transit depth', body: 'For a uniform disk the depth is exactly the ratio of areas. Limb darkening makes a central transit deeper, because the planet covers the bright middle of the star.', eq: String.raw`\frac{\Delta F}{F}\simeq\left(\frac{R_{p}}{R_{\star}}\right)^{2}=k^{2}` },
  { title: 'Quadratic limb darkening', body: 'Intensity falls from disk centre to limb. mu is the cosine of the angle between the line of sight and the surface normal, which is what the star shader evaluates for every pixel.', eq: String.raw`\frac{I(\mu)}{I(1)}=1-u_{1}(1-\mu)-u_{2}(1-\mu)^{2}` },
  { title: 'Impact parameter and inclination', body: 'How far from the star’s centre the chord passes, in stellar radii. It fixes the orbital inclination, which is why a transit pins down i so precisely.', eq: String.raw`b=\frac{a\cos i}{R_{\star}}` },
  { title: 'Transit duration', body: 'Follows from the chord length across the disk and the orbital speed. The dashed markers on the curve are first and last contact.', eq: String.raw`\frac{T_{14}}{P}=\frac{1}{\pi}\arcsin\left(\frac{\sqrt{(1+k)^{2}-b^{2}}}{a/R_{\star}}\right)` },
  { title: 'Transit probability', body: 'For randomly oriented orbits, the chance that a given planet transits at all. A hot Jupiter at ten stellar radii transits about one time in ten; Earth seen from afar, one in two hundred.', eq: String.raw`P_{\text{tr}}\approx\frac{R_{\star}+R_{p}}{a}` },
]

const CONTROLS = [
  { key: 'k', label: 'Radius ratio Rp/R*', min: 0.03, max: 0.28, step: 0.005, unit: '' },
  { key: 'b', label: 'Impact parameter', min: 0, max: 1.3, step: 0.01, unit: '' },
  { key: 'aOverR', label: 'Orbit size a/R*', min: 3.5, max: 20, step: 0.1, unit: '' },
  { key: 'u1', label: 'Limb darkening u₁', min: 0, max: 0.9, step: 0.02, unit: '' },
  { key: 'u2', label: 'Limb darkening u₂', min: 0, max: 0.6, step: 0.02, unit: '' },
  { key: 'noise', label: 'Photometric noise', min: 0, max: 3000, step: 50, unit: ' ppm' },
  { key: 'rate', label: 'Speed', min: 0.1, max: 2, step: 0.05, unit: '×' },
]

// Half-width of the plotted window, in orbital phase. Sized from the transit
// duration so the dip fills the card, which is how published curves are shown.
const windowFor = (aOverR, b, k) => Math.max(0.012, durationFraction(aOverR, b, k) * 1.6)

// Planet position on a circular orbit tilted so that, seen along +z, it
// crosses the star at impact parameter b. The same geometry as separation()
// in transit.js, lifted into three dimensions.
function planetPosition(out, phase, A, b) {
  const th = 2 * Math.PI * phase
  const cosI = Math.min(1, b / A)
  const sinI = Math.sqrt(1 - cosI * cosI)
  return out.set(A * Math.sin(th), A * Math.cos(th) * cosI, A * Math.cos(th) * sinI)
}

let ringTexture = null
function getRingTexture() {
  if (ringTexture) return ringTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.strokeStyle = 'rgba(255,255,255,0.95)'
  g.lineWidth = 7
  g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke()
  ringTexture = new THREE.CanvasTexture(c)
  return ringTexture
}

function OrbitGuides({ A, b, k }) {
  const { orbit, arc } = useMemo(() => {
    const v = new THREE.Vector3()
    const pts = []
    for (let i = 0; i <= 256; i++) pts.push(planetPosition(v, i / 256, A, b).clone())
    // The stretch of orbit during which the planet is in front of the disk.
    const half = durationFraction(A, b, k) / 2
    const arcPts = []
    if (half > 0) {
      for (let i = 0; i <= 40; i++) arcPts.push(planetPosition(v, -half + (i / 40) * 2 * half, A, b).clone())
    }
    return {
      orbit: new THREE.BufferGeometry().setFromPoints(pts),
      arc: arcPts.length ? new THREE.BufferGeometry().setFromPoints(arcPts) : null,
    }
  }, [A, b, k])
  useEffect(() => () => { orbit.dispose(); arc?.dispose() }, [orbit, arc])

  return (
    <group>
      <line geometry={orbit} layers={SCENERY}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0.4} depthWrite={false} />
      </line>
      {arc && (
        <line geometry={arc} layers={SCENERY}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.95} />
        </line>
      )}
      {/* The column of sky between star and telescope: the planet has to pass
          through it for there to be a transit at all. */}
      <Sightline start={1.05} length={A * 1.35} column={1} />
    </group>
  )
}

function Planet({ paramsRef, onSample }) {
  const bodyRef = useRef(null)
  const ringRef = useRef(null)
  const phaseRef = useRef(-0.12)
  const v = useMemo(() => new THREE.Vector3(), [])
  const ringMap = getRingTexture()

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const q = paramsRef.current
    const win = windowFor(q.aOverR, q.b, q.k)
    let ph = phaseRef.current
    const fast = 0.125 * q.rate
    const slow = Math.min(fast, ((2 * win) / 5) * q.rate)
    // Ease the clock down on the way into the transit window and back up after.
    const w = 1 - THREE.MathUtils.smoothstep(Math.abs(ph), win, win * 1.8)
    ph += dt * THREE.MathUtils.lerp(fast, slow, w)
    if (ph >= 0.5) ph -= 1
    phaseRef.current = ph

    planetPosition(v, ph, q.aOverR, q.b)
    if (bodyRef.current) {
      bodyRef.current.position.copy(v)
      bodyRef.current.scale.setScalar(q.k)
    }
    if (ringRef.current) {
      ringRef.current.position.copy(v)
      ringRef.current.material.opacity = 0.35 + 0.45 * w
    }
    onSample(ph, win, w)
  })

  return (
    <>
      <mesh ref={bodyRef}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshStandardMaterial color="#8aa6c9" roughness={0.85} metalness={0} />
      </mesh>
      {/* Fixed on-screen size, so the planet stays findable from far away. */}
      <sprite ref={ringRef} scale={[0.045, 0.045, 1]} layers={SCENERY}>
        <spriteMaterial map={ringMap} color={ACCENT} transparent sizeAttenuation={false} depthWrite={false} />
      </sprite>
    </>
  )
}

export default function ExoplanetTransit({ onSwitchSim }) {
  const [p, setP] = useState({ k: 0.12, b: 0.3, aOverR: 9, u1: 0.44, u2: 0.23, noise: 450, rate: 1 })
  const set = (key, v) => setP((q) => ({ ...q, [key]: v }))
  const [live, setLive] = useState({ flux: 1, slow: false })
  const paramsRef = useRef(p)
  paramsRef.current = p
  const insetRef = useRef(null)
  const { canvasRef, ctxRef } = useCurveCanvas()
  const reportRef = useRef(0)

  // The model light curve across the plotted window. Recomputed only when the
  // geometry or limb darkening changes, never per frame.
  const { k, b, aOverR, u1, u2 } = p
  const model = useMemo(() => {
    const win = windowFor(aOverR, b, k)
    const out = new Float32Array(MODEL_SAMPLES)
    let lo = 1
    for (let i = 0; i < MODEL_SAMPLES; i++) {
      const ph = -win + (i / (MODEL_SAMPLES - 1)) * 2 * win
      out[i] = relativeFlux(separation(ph, aOverR, b).d, k, u1, u2, 40)
      lo = Math.min(lo, out[i])
    }
    return { flux: out, lo }
  }, [k, b, aOverR, u1, u2])

  // Observed samples, one slot per bin. Cleared whenever the model changes so
  // points from another geometry never sit on the new curve.
  const binsRef = useRef(null)
  if (binsRef.current === null) binsRef.current = new Float32Array(BINS).fill(NaN)
  useEffect(() => { binsRef.current.fill(NaN) }, [model])
  const noiseRef = useRef(null)
  if (noiseRef.current === null) noiseRef.current = makeNoise(20260913)

  const onSample = (ph, win, w) => {
    const q = paramsRef.current
    const inWindow = Math.abs(ph) < win
    const x = (ph + win) / (2 * win)
    let flux = 1
    if (inWindow) {
      flux = relativeFlux(separation(ph, q.aOverR, q.b).d, q.k, q.u1, q.u2, 28)
      const i = Math.min(BINS - 1, Math.floor(x * BINS))
      binsRef.current[i] = flux + noiseRef.current() * q.noise * 1e-6
    }
    const sigma = q.noise * 1e-6
    const span = Math.max(1 - model.lo, geometricDepth(q.k) * 0.5, 0.0015)
    const half = durationFraction(q.aOverR, q.b, q.k) / 2
    drawCurve(ctxRef.current, {
      model: model.flux,
      bins: binsRef.current,
      cursor: inWindow ? { x, flux } : null,
      yMax: 1 + span * 0.18 + sigma * 2.5,
      yMin: 1 - span * 1.18 - sigma * 2.5,
      color: ACCENT,
      ticks: half > 0
        ? [
            { x: (-half + win) / (2 * win), label: 'T₁' },
            { x: 0.5, label: 'mid-transit' },
            { x: (half + win) / (2 * win), label: 'T₄' },
          ]
        : [],
      yFormat: (f) => f.toFixed(4),
    })

    const now = performance.now()
    if (now - reportRef.current > 90) {
      reportRef.current = now
      setLive({ flux, slow: w > 0.5 })
    }
  }

  const transits = b < 1 + k
  const depthPct = (1 - model.lo) * 100
  const incDeg = (Math.acos(Math.min(1, b / aOverR)) * 180) / Math.PI
  const readouts = [
    { label: 'Depth (measured)', value: transits ? `${depthPct.toFixed(3)} %` : 'no transit' },
    { label: 'Depth (k², uniform)', value: `${(geometricDepth(k) * 100).toFixed(3)} %` },
    { label: 'Naive Rp/R* from depth', value: transits ? Math.sqrt(depthPct / 100).toFixed(3) : 'n/a' },
    { label: 'Inclination', value: `${incDeg.toFixed(2)}°` },
    { label: 'Duration T₁₄', value: `${(durationFraction(aOverR, b, k) * 100).toFixed(2)} % of period` },
    { label: 'Transit probability', value: `${(((1 + k) / aOverR) * 100).toFixed(1)} %` },
    { label: 'Current flux', value: live.flux.toFixed(5) },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="exoplanetTransit" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Exoplanet transit" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [17, 9.5, 17], fov: 45, near: 0.05, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.8]}
      >
        <color attach="background" args={['#03050b']} />
        <StarsBackdrop />
        <ambientLight intensity={0.05} />
        <pointLight position={[0, 0, 0]} intensity={2.6} decay={0} color="#fff0d8" />
        <StarBody radius={1} color="#ffe9c4" u1={u1} u2={u2} />
        <Glow size={7.5} color="#ffc978" opacity={0.6} />
        <OrbitGuides A={aOverR} b={b} k={k} />
        <Planet paramsRef={paramsRef} onSample={onSample} />
        <TelescopeInset insetRef={insetRef} halfHeight={1.55} />
        <MainCamera x={150} y={95} />
        <OrbitControls
          makeDefault enableDamping dampingFactor={0.08} enablePan={false}
          minDistance={2.5} maxDistance={70} rotateSpeed={0.6}
        />
      </Canvas>
      <InsetFrame insetRef={insetRef} label="Telescope view" note="along the sightline" />
      <CurveCard
        canvasRef={canvasRef}
        title="Light curve"
        note={live.slow ? 'slow motion during transit' : 'relative flux around mid-transit'}
      />
      <div className="sim2-hud">
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">flux</span>
          <span className="sim2-hud-value">{live.flux.toFixed(5)}</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">depth</span>
          <span className="sim2-hud-value">{transits ? `${depthPct.toFixed(3)}%` : 'none'}</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">Rp/R*</span>
          <span className="sim2-hud-value">{k.toFixed(3)}</span>
        </div>
      </div>
    </div>
  )
}
