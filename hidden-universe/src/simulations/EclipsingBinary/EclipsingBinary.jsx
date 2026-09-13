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
  barycentreSplit, systemFlux, projectedSeparation, rocheLobe, binaryPeriod,
  surfaceBrightness,
} from './binary'
import { blackbodyColor } from '../BlackbodySpectra/planck'

const ACCENT = '#f59e0b'
const SEP = 5.2          // orbital separation, solar radii
const BINS = 220
const MODEL_SAMPLES = 480
const PHASE0 = -0.25     // plot runs from this phase over one full cycle

const cssColor = (T) => {
  const [r, g, b] = blackbodyColor(T)
  return `rgb(${r},${g},${b})`
}
const luminosity = (R, T) => R * R * Math.pow(T / 5772, 4)

const INTRO = [
  { title: 'What am I looking at?', body: 'Two stars orbiting their shared centre of mass, drawn to scale in solar radii. The inset is what a telescope at the end of the sightline sees, and the card below is the combined brightness it records over one orbit.' },
  { title: 'Why two different dips?', body: 'The deeper one is when the hotter star is hidden. Depth follows surface brightness, not size, so a small hot star blocked by a big cool one costs you more light than the other way round.' },
  { title: 'What can you learn from it?', body: 'Eclipsing binaries are how stellar masses and radii are actually measured. Dip widths give the radii, the orbit gives the masses, and almost everything else in stellar astrophysics is calibrated against them.' },
  { title: 'What can I change?', body: 'Mass ratio moves the barycentre, radii and temperatures reshape both dips, and inclination tilts the orbit until the stars stop crossing. Turn on the Roche lobes to see how close each star is to spilling onto its companion.' },
]

const PHYSICS = [
  { title: 'The barycentre', body: 'Both stars orbit their common centre of mass, the small cross in the scene. The heavier one traces the smaller circle, in exact inverse proportion to the masses.', eq: String.raw`m_{1}a_{1}=m_{2}a_{2},\qquad a=a_{1}+a_{2}` },
  { title: 'Eclipse depth', body: 'The light lost is the overlapping area times the surface brightness of whichever star is behind. That is why the deeper eclipse marks the hotter star.', eq: String.raw`\Delta F = A_{\text{overlap}}\times\frac{L}{\pi R^{2}}` },
  { title: 'Luminosity', body: 'Each star’s output follows from its size and temperature. A modest rise in temperature outweighs a large change in radius.', eq: String.raw`L=4\pi R^{2}\sigma T^{4}` },
  { title: 'Kepler’s third law', body: 'The orbit gives the total mass directly. Combine it with the ratio from the barycentre and you have both masses separately, which no other method does so cleanly.', eq: String.raw`M_{1}+M_{2}=\frac{a^{3}}{P^{2}}` },
  { title: 'Roche lobes', body: 'The region each star can fill before its gas is pulled to the companion, shown as the sphere of equal volume. Fill it and mass transfer begins, which drives novae and X-ray binaries.', eq: String.raw`\frac{R_{L}}{a}=\frac{0.49\,q^{2/3}}{0.6\,q^{2/3}+\ln(1+q^{1/3})}` },
]

const CONTROLS = [
  { key: 'q', label: 'Mass ratio M₂/M₁', min: 0.15, max: 1, step: 0.01, unit: '' },
  { key: 'r1', label: 'Radius, star 1', min: 0.5, max: 1.9, step: 0.02, unit: ' R☉' },
  { key: 'r2', label: 'Radius, star 2', min: 0.3, max: 1.4, step: 0.02, unit: ' R☉' },
  { key: 'T1', label: 'Temperature, star 1', min: 3200, max: 22000, step: 100, unit: ' K' },
  { key: 'T2', label: 'Temperature, star 2', min: 3200, max: 22000, step: 100, unit: ' K' },
  { key: 'inc', label: 'Inclination', min: 60, max: 90, step: 0.2, unit: '°' },
  { key: 'noise', label: 'Photometric noise', min: 0, max: 8000, step: 100, unit: ' ppm' },
  { key: 'lobes', label: 'Roche lobes', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
  { key: 'rate', label: 'Speed', min: 0.15, max: 2, step: 0.05, unit: '×' },
]

// Relative orbit vector (star 1 to star 2) at phase, for an observer on +z.
// Matches projectedSeparation() in binary.js: x and y are the sky plane.
function relative(out, phase, incDeg) {
  const i = (incDeg * Math.PI) / 180
  const th = 2 * Math.PI * phase
  return out.set(SEP * Math.sin(th), SEP * Math.cos(th) * Math.cos(i), SEP * Math.cos(th) * Math.sin(i))
}

function fluxAt(phase, q) {
  const s = projectedSeparation(phase, SEP, q.inc)
  return systemFlux(s.d, q.r1, q.r2, luminosity(q.r1, q.T1), luminosity(q.r2, q.T2), s.frontIsTwo)
}

function OrbitRings({ q, inc }) {
  const geos = useMemo(() => {
    const { a1, a2 } = barycentreSplit(1, q, SEP)
    const v = new THREE.Vector3()
    const one = [], two = []
    for (let i = 0; i <= 200; i++) {
      relative(v, i / 200, inc)
      one.push(v.clone().multiplyScalar(-a1 / SEP))
      two.push(v.clone().multiplyScalar(a2 / SEP))
    }
    return [new THREE.BufferGeometry().setFromPoints(one), new THREE.BufferGeometry().setFromPoints(two)]
  }, [q, inc])
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos])
  return (
    <>
      {geos.map((g, i) => (
        <line key={i} geometry={g} layers={SCENERY}>
          <lineBasicMaterial color={i ? '#ffd9a0' : '#bcd4ff'} transparent opacity={0.35} depthWrite={false} />
        </line>
      ))}
      {/* Barycentre. */}
      <group layers={SCENERY}>
        <mesh layers={SCENERY}><boxGeometry args={[0.5, 0.025, 0.025]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>
        <mesh layers={SCENERY}><boxGeometry args={[0.025, 0.5, 0.025]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>
        <mesh layers={SCENERY}><boxGeometry args={[0.025, 0.025, 0.5]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>
      </group>
    </>
  )
}

function Lobe({ lobeRef, radius, color }) {
  return (
    <mesh ref={lobeRef} scale={radius} layers={SCENERY}>
      <sphereGeometry args={[1, 28, 18]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.12} depthWrite={false} />
    </mesh>
  )
}

function Binary({ p, paramsRef, onSample }) {
  const s1 = useRef(null), s2 = useRef(null)
  const g1 = useRef(null), g2 = useRef(null)
  const l1 = useRef(null), l2 = useRef(null)
  const phaseRef = useRef(0.08)
  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const q = paramsRef.current
    phaseRef.current = (phaseRef.current + dt * 0.11 * q.rate) % 1
    const ph = phaseRef.current
    const { a1, a2 } = barycentreSplit(1, q.q, SEP)
    relative(v, ph, q.inc)
    const x = v.x, y = v.y, z = v.z
    const set = (ref, k) => ref.current?.position.set(x * k, y * k, z * k)
    set(s1, -a1 / SEP); set(g1, -a1 / SEP); set(l1, -a1 / SEP)
    set(s2, a2 / SEP); set(g2, a2 / SEP); set(l2, a2 / SEP)
    onSample(ph)
  })

  const L1 = luminosity(p.r1, p.T1), L2 = luminosity(p.r2, p.T2)
  // Glow grows with luminosity, compressed so a B star does not swallow the scene.
  const glow = (R, L) => R * 2.6 + Math.min(4, Math.log10(1 + L) * 1.1)
  return (
    <>
      <StarBody starRef={s1} radius={p.r1} color={cssColor(p.T1)} u1={0.5} u2={0.15} />
      <StarBody starRef={s2} radius={p.r2} color={cssColor(p.T2)} u1={0.5} u2={0.15} />
      <Glow spriteRef={g1} size={glow(p.r1, L1)} color={cssColor(p.T1)} opacity={0.5} />
      <Glow spriteRef={g2} size={glow(p.r2, L2)} color={cssColor(p.T2)} opacity={0.5} />
      {p.lobes > 0.5 && (
        <>
          <Lobe lobeRef={l1} radius={rocheLobe(1 / p.q, SEP)} color="#bcd4ff" />
          <Lobe lobeRef={l2} radius={rocheLobe(p.q, SEP)} color="#ffd9a0" />
        </>
      )}
    </>
  )
}

export default function EclipsingBinary({ onSwitchSim }) {
  const [p, setP] = useState({ q: 0.6, r1: 1.4, r2: 0.9, T1: 14000, T2: 5200, inc: 86, noise: 1500, lobes: 0, rate: 1 })
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }))
  const paramsRef = useRef(p)
  paramsRef.current = p
  const insetRef = useRef(null)
  const { canvasRef, ctxRef } = useCurveCanvas()
  const [live, setLive] = useState({ flux: 1, phase: 0 })
  const reportRef = useRef(0)

  const { r1, r2, T1, T2, inc } = p
  const model = useMemo(() => {
    const q = { r1, r2, T1, T2, inc }
    const out = new Float32Array(MODEL_SAMPLES)
    let lo = 1
    for (let i = 0; i < MODEL_SAMPLES; i++) {
      out[i] = fluxAt(PHASE0 + i / (MODEL_SAMPLES - 1), q)
      lo = Math.min(lo, out[i])
    }
    return { flux: out, lo }
  }, [r1, r2, T1, T2, inc])

  const binsRef = useRef(null)
  if (binsRef.current === null) binsRef.current = new Float32Array(BINS).fill(NaN)
  useEffect(() => { binsRef.current.fill(NaN) }, [model])
  const noiseRef = useRef(null)
  if (noiseRef.current === null) noiseRef.current = makeNoise(5200)

  const onSample = (ph) => {
    const q = paramsRef.current
    const flux = fluxAt(ph, q)
    const x = (((ph - PHASE0) % 1) + 1) % 1
    binsRef.current[Math.min(BINS - 1, Math.floor(x * BINS))] = flux + noiseRef.current() * q.noise * 1e-6
    const sigma = q.noise * 1e-6
    const span = Math.max(0.02, 1 - model.lo)
    drawCurve(ctxRef.current, {
      model: model.flux,
      bins: binsRef.current,
      cursor: { x, flux },
      yMax: 1 + span * 0.1 + sigma * 2.5,
      yMin: 1 - span * 1.12 - sigma * 2.5,
      color: ACCENT,
      ticks: [
        { x: 0.25, label: 'star 1 eclipsed' },
        { x: 0.75, label: 'star 2 eclipsed' },
      ],
      yFormat: (f) => f.toFixed(3),
    })
    const now = performance.now()
    if (now - reportRef.current > 100) {
      reportRef.current = now
      setLive({ flux, phase: ph })
    }
  }

  const L1 = luminosity(r1, T1)
  const L2 = luminosity(r2, T2)
  const lobe1 = rocheLobe(1 / p.q, SEP)
  const lobe2 = rocheLobe(p.q, SEP)
  const sb1 = surfaceBrightness(L1, r1), sb2 = surfaceBrightness(L2, r2)
  const depth1 = 1 - fluxAt(0, p)
  const depth2 = 1 - fluxAt(0.5, p)
  const overflow = r1 > lobe1 ? 'star 1 overflows' : r2 > lobe2 ? 'star 2 overflows' : 'both detached'
  const readouts = [
    { label: 'Luminosity, star 1', value: `${L1.toFixed(2)} L☉` },
    { label: 'Luminosity, star 2', value: `${L2.toFixed(2)} L☉` },
    { label: 'Eclipse depth, star 1 hidden', value: `${(depth1 * 100).toFixed(2)} %` },
    { label: 'Eclipse depth, star 2 hidden', value: `${(depth2 * 100).toFixed(2)} %` },
    { label: 'Deeper eclipse hides', value: sb1 > sb2 ? 'star 1 (hotter surface)' : 'star 2 (hotter surface)' },
    { label: 'Orbital period', value: `${(binaryPeriod(SEP * 0.00465, 1, p.q) * 365.25).toFixed(2)} d` },
    { label: 'Roche lobes', value: `${lobe1.toFixed(2)} / ${lobe2.toFixed(2)} R☉` },
    { label: 'Mass transfer', value: overflow },
    { label: 'Current flux', value: live.flux.toFixed(4) },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="eclipsingBinary" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Eclipsing binary" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [7.5, 6.5, 12], fov: 45, near: 0.05, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.8]}
      >
        <color attach="background" args={['#03050b']} />
        <StarsBackdrop />
        <OrbitRings q={p.q} inc={inc} />
        <Binary p={p} paramsRef={paramsRef} onSample={onSample} />
        <Sightline start={0.4} length={5.6} />
        <TelescopeInset insetRef={insetRef} halfHeight={3.4} />
        <MainCamera x={150} y={95} />
        <OrbitControls
          makeDefault enableDamping dampingFactor={0.08} enablePan={false}
          minDistance={4} maxDistance={45} rotateSpeed={0.6}
        />
      </Canvas>
      <InsetFrame insetRef={insetRef} className="ss-inset-wide" label="Telescope view" note="along the sightline" />
      <CurveCard canvasRef={canvasRef} title="Light curve" note="relative flux over one orbit" />
      <div className="sim2-hud">
        <div className="sim2-hud-item"><span className="sim2-hud-label">flux</span><span className="sim2-hud-value">{live.flux.toFixed(4)}</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">phase</span><span className="sim2-hud-value">{live.phase.toFixed(2)}</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">L₁/L₂</span><span className="sim2-hud-value">{(L1 / L2).toFixed(1)}</span></div>
      </div>
    </div>
  )
}
