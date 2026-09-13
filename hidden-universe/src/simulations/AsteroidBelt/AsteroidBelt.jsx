import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import { CurveCard, Glow, MainCamera, StarBody, StarsBackdrop } from '../shared/StellarScene'
import { useCurveCanvas } from '../shared/lightCurve'
import '../shared/simBase.css'
import {
  JUPITER_A, BELT_INNER, BELT_OUTER, RESONANCES, periodOf,
  pumpEccentricity, isCleared, positionOf, TROJAN_LEAD, rng, MARS_A,
} from './belt'

const ACCENT = '#c9a36a'
const COUNT = 9000
const SCALE = 1.35 // AU to scene units
const HIST_BINS = 96
// Two clocks. Orbits are animated at a watchable pace; the resonant pumping,
// which takes around a million years, runs on its own much faster clock.
// Driving both from one clock would either freeze the gaps or turn the orbits
// into strobing noise.
const ORBIT_YR_PER_S = 0.8

// Round, soft-edged point sprites instead of the default squares.
let dotTexture = null
function getDotTexture() {
  if (dotTexture) return dotTexture
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 32, 32)
  dotTexture = new THREE.CanvasTexture(c)
  return dotTexture
}

// Jupiter's cloud belts, as a canvas stripe texture.
let bandTexture = null
function getBandTexture() {
  if (bandTexture) return bandTexture
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 256
  const g = c.getContext('2d')
  const rand = rng(1610)
  for (let y = 0; y < 256; y++) {
    const lat = y / 255
    const band = Math.sin(lat * Math.PI * 9 + rand() * 0.25)
    const t = 0.5 + 0.5 * band
    const r = 196 + 40 * t, gg = 160 + 42 * t, b = 118 + 50 * t
    g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`
    g.fillRect(0, y, 8, 1)
  }
  bandTexture = new THREE.CanvasTexture(c)
  bandTexture.colorSpace = THREE.SRGBColorSpace
  return bandTexture
}

// One typed-array pass per frame. Nine thousand bodies is far past the point
// where a mesh each would be sensible, so this is one Points object whose
// buffer is rewritten in place.
function Belt({ jupiterMass, running, rate, onStats, onHistogram }) {
  const pointsRef = useRef(null)
  const stateRef = useRef(null)
  const clockRef = useRef(0)
  const lastReport = useRef(0)

  if (stateRef.current === null) {
    const a = new Float32Array(COUNT)
    const e = new Float32Array(COUNT)
    const phase = new Float32Array(COUNT)
    const alive = new Uint8Array(COUNT)
    const rand = rng(20260911)
    for (let i = 0; i < COUNT; i++) {
      // Uniform in area, so the belt does not look bunched toward the inside.
      const u = rand()
      a[i] = Math.sqrt(u * (BELT_OUTER ** 2 - BELT_INNER ** 2) + BELT_INNER ** 2)
      e[i] = rand() * 0.09
      phase[i] = rand() * Math.PI * 2
      alive[i] = 1
    }
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    stateRef.current = { a, e, phase, alive, positions, colors, geo: null }
  }
  const S = stateRef.current

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(S.positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(S.colors, 3))
    return g
  }, [S])

  useFrame((_, dt) => {
    const frame = running ? Math.min(dt, 0.05) : 0
    const step = frame * rate * 1000              // secular years this frame
    clockRef.current += step
    S.orbitT = (S.orbitT || 0) + frame * ORBIT_YR_PER_S
    const t = S.orbitT
    let live = 0

    for (let i = 0; i < COUNT; i++) {
      if (!S.alive[i]) continue
      if (step > 0) {
        S.e[i] = pumpEccentricity(S.e[i], S.a[i], step, jupiterMass)
        if (isCleared(S.a[i], S.e[i])) {
          S.alive[i] = 0
          S.positions[i * 3] = 0
          S.positions[i * 3 + 1] = -9999 // park it off-screen
          S.positions[i * 3 + 2] = 0
          continue
        }
      }
      const p = positionOf(S.a[i], S.e[i], S.phase[i], t)
      S.positions[i * 3] = p.x * SCALE
      S.positions[i * 3 + 1] = (S.e[i] - 0.04) * 0.9 // eccentric orbits puff up
      S.positions[i * 3 + 2] = p.y * SCALE
      // Warmer as eccentricity climbs, so a body being pumped is visible.
      const hot = Math.min(1, S.e[i] * 4)
      S.colors[i * 3] = 0.72 + hot * 0.28
      S.colors[i * 3 + 1] = 0.62 - hot * 0.3
      S.colors[i * 3 + 2] = 0.44 - hot * 0.3
      live++
    }

    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate = true

    // Histogram of surviving semi-major axes: Kirkwood's own plot.
    const hist = S.hist || (S.hist = new Float32Array(HIST_BINS))
    hist.fill(0)
    for (let i = 0; i < COUNT; i++) {
      if (!S.alive[i]) continue
      const k = Math.floor(((S.a[i] - BELT_INNER) / (BELT_OUTER - BELT_INNER)) * HIST_BINS)
      if (k >= 0 && k < HIST_BINS) hist[k]++
    }
    onHistogram?.(hist)

    const now = performance.now()
    if (now - lastReport.current > 260) {
      lastReport.current = now
      onStats?.({ live, elapsed: clockRef.current })
    }
  })

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial size={0.05} vertexColors sizeAttenuation transparent opacity={0.95} map={getDotTexture()} alphaTest={0.05} depthWrite={false} />
    </points>
  )
}

function Jupiter({ running }) {
  const ref = useRef(null)
  const leadRef = useRef(null)
  const trailRef = useRef(null)
  const tRef = useRef(0)
  useFrame((_, dt) => {
    if (running) tRef.current += Math.min(dt, 0.05) * ORBIT_YR_PER_S
    const th = (2 * Math.PI * tRef.current) / periodOf(JUPITER_A)
    const R = JUPITER_A * SCALE
    if (ref.current) ref.current.position.set(R * Math.cos(th), 0, R * Math.sin(th))
    // The Trojan clouds ride 60 degrees ahead of and behind Jupiter.
    if (leadRef.current) leadRef.current.position.set(R * Math.cos(th + TROJAN_LEAD), 0, R * Math.sin(th + TROJAN_LEAD))
    if (trailRef.current) trailRef.current.position.set(R * Math.cos(th - TROJAN_LEAD), 0, R * Math.sin(th - TROJAN_LEAD))
  })
  const cloud = useMemo(() => {
    const n = 260
    const pos = new Float32Array(n * 3)
    const rand = rng(4242)
    for (let i = 0; i < n; i++) {
      const ang = rand() * Math.PI * 2
      const rad = Math.sqrt(rand())
      pos[i * 3] = Math.cos(ang) * rad * 0.75
      pos[i * 3 + 1] = (rand() - 0.5) * 0.16
      pos[i * 3 + 2] = Math.sin(ang) * rad * 0.5
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.22, 40, 28]} />
        <meshStandardMaterial map={getBandTexture()} emissive="#6b4a24" emissiveIntensity={0.35} roughness={0.7} />
      </mesh>
      <points ref={leadRef} geometry={cloud}>
        <pointsMaterial color="#8fd3ff" size={0.05} transparent opacity={0.8} sizeAttenuation map={getDotTexture()} alphaTest={0.05} depthWrite={false} />
      </points>
      <points ref={trailRef} geometry={cloud}>
        <pointsMaterial color="#8fd3ff" size={0.05} transparent opacity={0.8} sizeAttenuation map={getDotTexture()} alphaTest={0.05} depthWrite={false} />
      </points>
    </>
  )
}

// Rings at the resonance radii, so you can see the gaps open exactly there.
function ResonanceRings({ show }) {
  const geos = useMemo(
    () => RESONANCES.map((r) => {
      const pts = []
      for (let i = 0; i <= 120; i++) {
        const th = (i / 120) * Math.PI * 2
        pts.push(new THREE.Vector3(Math.cos(th) * r.a * SCALE, 0, Math.sin(th) * r.a * SCALE))
      }
      return { geo: new THREE.BufferGeometry().setFromPoints(pts), label: r.label }
    }),
    []
  )
  if (!show) return null
  return (
    <>
      {geos.map(({ geo, label }) => (
        <line key={label} geometry={geo}>
          <lineBasicMaterial color="#ff9d6c" transparent opacity={0.5} />
        </line>
      ))}
    </>
  )
}

// Mars's orbit: an asteroid whose perihelion drops inside it gets thrown out.
function MarsOrbit() {
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 160; i++) {
      const th = (i / 160) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(th) * MARS_A * SCALE, 0, Math.sin(th) * MARS_A * SCALE))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <group>
      <line geometry={geo} onUpdate={(l) => l.computeLineDistances()}>
        <lineDashedMaterial color="#f87171" dashSize={0.12} gapSize={0.09} transparent opacity={0.55} />
      </line>
      <Html position={[-MARS_A * SCALE * 0.7071, 0, MARS_A * SCALE * 0.7071]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <span className="ss-tag" style={{ borderColor: 'rgba(248,113,113,0.5)', color: '#fecaca' }}>Mars orbit</span>
      </Html>
    </group>
  )
}

function drawKirkwood(c, hist, jupiterMass) {
  if (!c) return
  const { ctx, W, H } = c
  const L = 40, R = 12, T = 18, B = 22
  const X = (a) => L + ((a - BELT_INNER) / (BELT_OUTER - BELT_INNER)) * (W - L - R)
  // Fixed vertical scale from the initial, uniform-in-area distribution.
  const peak = (COUNT / HIST_BINS) * 1.45
  const Y = (n) => H - B - Math.min(1, n / peak) * (H - T - B)
  ctx.clearRect(0, 0, W, H)
  ctx.font = '10.5px ui-sans-serif, system-ui, sans-serif'
  for (const a of [2.0, 2.4, 2.8, 3.2, 3.6]) {
    ctx.fillStyle = 'rgba(230,239,255,0.5)'
    const label = `${a.toFixed(1)} AU`
    const w = ctx.measureText(label).width
    ctx.fillText(label, Math.min(W - R - w, Math.max(L, X(a) - w / 2)), H - 6)
  }
  for (const r of RESONANCES) {
    if (r.a < BELT_INNER || r.a > BELT_OUTER) continue
    ctx.strokeStyle = 'rgba(255,157,108,0.45)'
    ctx.setLineDash([3, 4])
    ctx.beginPath(); ctx.moveTo(X(r.a), T - 2); ctx.lineTo(X(r.a), H - B); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,190,150,0.9)'
    ctx.fillText(r.label, X(r.a) - ctx.measureText(r.label).width / 2, T - 6)
  }
  const bw = (W - L - R) / HIST_BINS
  for (let k = 0; k < HIST_BINS; k++) {
    const y = Y(hist[k])
    ctx.fillStyle = 'rgba(201,163,106,0.85)'
    ctx.fillRect(L + k * bw + 0.5, y, Math.max(1, bw - 1), H - B - y)
  }
  ctx.save()
  ctx.translate(11, T + (H - T - B) / 2); ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = 'rgba(230,239,255,0.5)'
  ctx.fillText('count', -14, 0)
  ctx.restore()
  if (jupiterMass === 0) {
    ctx.fillStyle = 'rgba(230,239,255,0.6)'
    ctx.fillText('no Jupiter, no resonances', L + 8, T + 12)
  }
}

const INTRO = [
  { title: 'What am I looking at?', body: 'Nine thousand test asteroids orbiting the Sun between Mars and Jupiter, plus Jupiter itself and its two Trojan clouds riding sixty degrees ahead of and behind it.' },
  { title: 'Why do gaps appear?', body: 'Where an asteroid’s period is a simple fraction of Jupiter’s, it gets the same tug at the same point every few orbits. Those tugs add up instead of cancelling, and the eccentricity climbs.' },
  { title: 'Where do they go?', body: 'Once the eccentricity is high enough the orbit crosses Mars. A close encounter then throws the asteroid out of the belt entirely, which is why the gap ends up empty.' },
  { title: 'What can I change?', body: 'Jupiter’s mass sets how hard the resonances are driven. Turn it down and the belt survives; turn it up and the gaps open faster. The card below is Kirkwood’s 1866 plot: asteroid count against orbit size, with the gaps appearing exactly at the resonances.' },
]

const PHYSICS = [
  { title: 'Mean-motion resonance', body: 'A resonance is an integer ratio of orbital periods. The 3:1 gap is where an asteroid completes exactly three orbits for each one of Jupiter’s.', eq: String.raw`\frac{T_{\text{ast}}}{T_{\text{Jup}}}=\frac{q}{p}\;\Rightarrow\;a=a_{J}\left(\frac{q}{p}\right)^{2/3}` },
  { title: 'Why the kicks add up', body: 'Off resonance the geometry of successive encounters drifts and the perturbations average away. On resonance the configuration repeats, so the same kick arrives in the same place each time.', eq: String.raw`\Delta\varpi\;\text{repeats}\;\Rightarrow\;\left\langle \frac{de}{dt}\right\rangle \neq 0` },
  { title: 'Clearing the gap', body: 'The pumped eccentricity drops the perihelion until it crosses a planet. The resulting close encounter removes the asteroid, so the gap is carved by ejection rather than collisions.', eq: String.raw`q=a(1-e)<a_{\text{Mars}}` },
  { title: 'The Trojans are the exception', body: 'At the L4 and L5 points the resonance is 1:1 and stable rather than destructive. Bodies there are shepherded instead of ejected, which is why two clouds sit sixty degrees from Jupiter.', eq: String.raw`\lambda-\lambda_{J}=\pm 60^{\circ}` },
]

const CONTROLS = [
  { key: 'jupiterMass', label: 'Jupiter mass', min: 0, max: 2.5, step: 0.05, unit: '×' },
  { key: 'rate', label: 'Evolution rate', min: 5, max: 200, step: 5, unit: ' kyr/s' },
  { key: 'running', label: 'Clock', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'running' : 'paused') },
  { key: 'rings', label: 'Resonance markers', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
]

export default function AsteroidBelt({ onSwitchSim }) {
  const [p, setP] = useState({ jupiterMass: 1, rate: 60, running: 1, rings: 1 })
  const set = (k, v) => setP((q) => ({ ...q, [k]: v }))
  const [stats, setStats] = useState({ live: COUNT, elapsed: 0 })
  const { canvasRef, ctxRef } = useCurveCanvas()
  const frameRef = useRef(0)
  const massRef = useRef(p.jupiterMass)
  massRef.current = p.jupiterMass
  const onHistogram = (hist) => {
    // Every third frame is plenty for a histogram.
    if (frameRef.current++ % 3 === 0) drawKirkwood(ctxRef.current, hist, massRef.current)
  }

  const readouts = [
    { label: 'Asteroids left', value: `${stats.live.toLocaleString()} of ${COUNT.toLocaleString()}` },
    { label: 'Cleared', value: `${(100 * (1 - stats.live / COUNT)).toFixed(1)}%` },
    { label: 'Elapsed', value: `${(stats.elapsed / 1e6).toFixed(2)} Myr` },
    ...RESONANCES.slice(0, 4).map((r) => ({ label: `${r.label} gap`, value: `${r.a.toFixed(2)} AU` })),
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="asteroidBelt" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="The asteroid belt" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 8.2, 8.8], fov: 50, near: 0.1, far: 300 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.7]}
      >
        <color attach="background" args={['#05060c']} />
        <StarsBackdrop />
        <MainCamera x={150} y={80} />
        <ambientLight intensity={0.35} />
        <pointLight position={[0, 0, 0]} intensity={3.2} decay={0} color="#ffe2b8" />
        <StarBody radius={0.3} color="#fff1dc" u1={0.5} u2={0.15} />
        <Glow size={2.4} color="#ffc56e" opacity={0.7} />
        <MarsOrbit />
        <ResonanceRings show={p.rings > 0.5} />
        <Belt jupiterMass={p.jupiterMass} running={p.running > 0.5} rate={p.rate} onStats={setStats} onHistogram={onHistogram} />
        <Jupiter running={p.running > 0.5} />
        <OrbitControls
          makeDefault enableRotate enableZoom enablePan={false} enableDamping
          dampingFactor={0.08} minDistance={4} maxDistance={34} rotateSpeed={0.6}
        />
      </Canvas>
      <CurveCard canvasRef={canvasRef} title="Kirkwood gaps" note="surviving asteroids by orbit size" />
      <div className="sim2-hud">
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">asteroids</span>
          <span className="sim2-hud-value">{stats.live.toLocaleString()}</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">cleared</span>
          <span className="sim2-hud-value">{(100 * (1 - stats.live / COUNT)).toFixed(1)}%</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">elapsed</span>
          <span className="sim2-hud-value">{(stats.elapsed / 1e6).toFixed(2)} Myr</span>
        </div>
      </div>
    </div>
  )
}
