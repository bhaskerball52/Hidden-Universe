import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import { CurveCard, MainCamera, StarsBackdrop } from '../shared/StellarScene'
import { useCurveCanvas } from '../shared/lightCurve'
import '../shared/simBase.css'
import { rng } from '../AsteroidBelt/belt'
import {
  H0, redshiftFrom, hubbleTimeGyr, hubbleRadiusMpc, scaleAt, hubbleAt,
} from './cosmo'

const ACCENT = '#f472b6'
const NX = 9, NY = 3, NZ = 9    // galaxies per axis of the comoving lattice
const SPACING = 1.0             // scene units per lattice step (comoving)
const LY = 1.15                 // vertical spacing, so the slab is not a cube
const MPC_PER_UNIT = 50         // one comoving lattice step is 50 Mpc today
const D_MAX = 600, V_MAX = 40000 // Hubble diagram axes, Mpc and km/s
const COUNT = NX * NY * NZ

// A comoving lattice with a little scatter, so it reads as a universe rather
// than graph paper. Lattice indices are kept so the view can wrap periodically:
// in a homogeneous universe every galaxy has neighbours in every direction.
function makeGalaxies() {
  const rand = rng(20260911)
  const g = []
  for (let i = 0; i < NX; i++) {
    for (let k = 0; k < NY; k++) {
      for (let j = 0; j < NZ; j++) {
        const jitter = () => (rand() - 0.5) * 0.32
        g.push({
          x: i * SPACING + jitter(), y: k * LY + jitter() * 0.6, z: j * SPACING + jitter(),
          size: 0.75 + rand() * 0.8,
          angle: rand() * Math.PI,
          flat: 0.35 + rand() * 0.6,
          warm: rand(),
          // Peculiar velocity along the line of sight, km/s: real galaxies also
          // fall toward their neighbours, which scatters the Hubble diagram.
          pec: Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand()) * 450,
        })
      }
    }
  }
  return g
}

// Wrap a separation into the periodic box centred on the observer.
const wrap = (d, L) => d - L * Math.round(d / L)

const GALAXY_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAngle;
  attribute float aFlat;
  attribute vec3 aColor;
  varying float vAngle;
  varying float vFlat;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * 380.0 / -mv.z;
    vAngle = aAngle;
    vFlat = aFlat;
    vColor = aColor;
  }
`

// A soft elliptical galaxy: a bright bulge in a fainter tilted disk.
const GALAXY_FRAG = /* glsl */ `
  varying float vAngle;
  varying float vFlat;
  varying vec3 vColor;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float c = cos(vAngle), s = sin(vAngle);
    vec2 q = vec2(c * p.x - s * p.y, (s * p.x + c * p.y) / vFlat);
    float r = length(q);
    float disk = exp(-r * r * 5.0);
    float bulge = exp(-dot(p, p) * 38.0);
    float a = disk * 0.75 + bulge;
    if (a < 0.01) discard;
    vec3 col = vColor * disk + vec3(1.0, 0.97, 0.9) * bulge;
    gl_FragColor = vec4(col * a, a);
  }
`

function Universe({ galaxies, aRef, tRef, observer, showArrows, onFrame }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(Float32Array.from(galaxies, (x) => x.size), 1))
    g.setAttribute('aAngle', new THREE.BufferAttribute(Float32Array.from(galaxies, (x) => x.angle), 1))
    g.setAttribute('aFlat', new THREE.BufferAttribute(Float32Array.from(galaxies, (x) => x.flat), 1))
    return g
  }, [galaxies])
  const arrows = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: GALAXY_VERT,
    fragmentShader: GALAXY_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])
  useEffect(() => () => { geo.dispose(); arrows.dispose(); mat.dispose() }, [geo, arrows, mat])

  useFrame(() => {
    const a = aRef.current
    const H = hubbleAt(tRef.current)
    const o = galaxies[observer]
    const pos = geo.attributes.position.array
    const col = geo.attributes.aColor.array
    const ap = arrows.attributes.position.array
    const ac = arrows.attributes.color.array
    const Lx = NX * SPACING, Ly = NY * LY, Lz = NZ * SPACING
    const samples = []
    for (let i = 0; i < COUNT; i++) {
      const g = galaxies[i]
      // Proper position relative to the observer: comoving separation, wrapped,
      // times the scale factor. The observer is at rest at the origin.
      const px = wrap(g.x - o.x, Lx) * a
      const py = wrap(g.y - o.y, Ly) * a
      const pz = wrap(g.z - o.z, Lz) * a
      pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz

      // Hubble's law at this moment, in real units.
      const dScene = Math.hypot(px, py, pz)
      const dMpc = dScene * MPC_PER_UNIT
      const v = H * dMpc
      samples.push(dMpc, Math.max(0, v + g.pec))

      // Colour: intrinsic warm or blue population, reddened with recession
      // speed so the far side of the slab reads redder, as observed.
      const zr = Math.min(1, v / 26000)
      const base = g.warm > 0.5 ? [1.0, 0.82, 0.6] : [0.66, 0.78, 1.0]
      const r = base[0] * (1 - zr) + 1.0 * zr
      const gg = base[1] * (1 - zr) + 0.42 * zr
      const b = base[2] * (1 - zr) + 0.3 * zr
      col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b

      // Velocity arrow, pointing away from the observer, length proportional to v.
      const len = dScene > 1e-6 ? (v / V_MAX) * 1.1 / dScene : 0
      ap[i * 6] = px; ap[i * 6 + 1] = py; ap[i * 6 + 2] = pz
      ap[i * 6 + 3] = px * (1 + len); ap[i * 6 + 4] = py * (1 + len); ap[i * 6 + 5] = pz * (1 + len)
      ac[i * 6] = r * 0.2; ac[i * 6 + 1] = gg * 0.2; ac[i * 6 + 2] = b * 0.2
      ac[i * 6 + 3] = r; ac[i * 6 + 4] = gg; ac[i * 6 + 5] = b
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aColor.needsUpdate = true
    arrows.attributes.position.needsUpdate = true
    arrows.attributes.color.needsUpdate = true
    onFrame(samples, a, H)
  })

  return (
    <>
      <points geometry={geo} material={mat} frustumCulled={false} />
      {showArrows && (
        <lineSegments geometry={arrows} frustumCulled={false}>
          <lineBasicMaterial vertexColors transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
      )}
    </>
  )
}

// The comoving grid. It stretches with the universe, which is the point: the
// galaxies stay put on it while the grid itself grows.
function ComovingGrid({ aRef, observer, galaxies }) {
  const ref = useRef(null)
  const geo = useMemo(() => {
    const pts = []
    const h = 4.5
    for (let i = -4; i <= 4; i++) {
      pts.push(new THREE.Vector3(i, 0, -h), new THREE.Vector3(i, 0, h))
      pts.push(new THREE.Vector3(-h, 0, i), new THREE.Vector3(h, 0, i))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const a = aRef.current
    const o = galaxies[observer]
    // Keep lines through the lattice points: offset by the observer's scatter
    // from its own gridpoint, which the periodic wrap leaves unchanged.
    g.scale.setScalar(a)
    g.position.set(-(o.x - Math.round(o.x)) * a, -(o.y - Math.round(o.y / LY) * LY) * a, -(o.z - Math.round(o.z)) * a)
  })
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#6d7bd6" transparent opacity={0.2} depthWrite={false} />
    </lineSegments>
  )
}

// Hoisted, not declared inside the component: a nested definition is a new
// component type on every render, which remounts it and resets the clock.
function Clock({ paramsRef, tRef, aRef }) {
  useFrame((_, dt) => {
    const q = paramsRef.current
    if (q.running > 0.5) {
      tRef.current += Math.min(dt, 0.05) * 0.09
      if (tRef.current > 2.2) tRef.current = 0.25
    } else {
      tRef.current = q.time
    }
    aRef.current = scaleAt(tRef.current)
  }, -1)
  return null
}

let ringTexture = null
function getRingTexture() {
  if (ringTexture) return ringTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.strokeStyle = '#fff'
  g.lineWidth = 6
  g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke()
  ringTexture = new THREE.CanvasTexture(c)
  return ringTexture
}

function drawHubble(c, samples, H) {
  if (!c) return
  const { ctx, W, H: Hpx } = c
  const L = 52, R = 12, T = 8, B = 22
  const X = (d) => L + (d / D_MAX) * (W - L - R)
  const Y = (v) => Hpx - B - (v / V_MAX) * (Hpx - T - B)
  ctx.clearRect(0, 0, W, Hpx)
  ctx.font = '10.5px ui-sans-serif, system-ui, sans-serif'
  ctx.lineWidth = 1
  for (const v of [0, 20000, 40000]) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(W - R, Y(v)); ctx.stroke()
    ctx.fillStyle = 'rgba(230,239,255,0.5)'
    ctx.fillText(v === 0 ? '0' : `${v / 1000}k km/s`, 4, Y(v) + 3.5)
  }
  for (const d of [0, 200, 400, 600]) {
    const label = `${d} Mpc`
    const w = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(230,239,255,0.5)'
    ctx.fillText(label, Math.min(W - R - w, Math.max(L, X(d) - w / 2)), Hpx - 6)
  }
  // Today's slope, faint, for comparison with the current one.
  ctx.setLineDash([4, 5])
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(Math.min(D_MAX, V_MAX / H0)), Y(Math.min(V_MAX, H0 * D_MAX))); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText('today, H₀', X(Math.min(D_MAX, V_MAX / H0)) - 58, Y(Math.min(V_MAX, H0 * D_MAX)) + 14)

  ctx.fillStyle = 'rgba(226,236,255,0.75)'
  for (let i = 0; i < samples.length; i += 2) {
    const d = samples[i], v = samples[i + 1]
    if (d > D_MAX || v > V_MAX || d < 1) continue
    ctx.fillRect(X(d) - 1.3, Y(v) - 1.3, 2.6, 2.6)
  }
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 2
  const dEnd = Math.min(D_MAX, V_MAX / H)
  ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(dEnd), Y(H * dEnd)); ctx.stroke()
  ctx.fillStyle = ACCENT
  ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(`v = H d,  H = ${H.toFixed(0)} km/s/Mpc`, L + 8, T + 14)
}

const INTRO = [
  { title: 'What am I looking at?', body: 'A slab of galaxies in an expanding universe, seen from the one ringed at the centre. They are not flying apart through space. The space between them is growing, and they are carried along with it.' },
  { title: 'Where is the centre?', body: 'There isn’t one. Switch the observer to any galaxy and the view is the same: every other galaxy recedes, faster the farther away it is. The lattice repeats in every direction, as a uniform universe does.' },
  { title: 'What do the arrows and the card show?', body: 'Each arrow is a recession velocity, and the card plots speed against distance for every galaxy in view. They fall on a straight line, which is Hubble’s law.' },
  { title: 'What can I change?', body: 'Run the clock to expand or rewind the universe. Watch the line in the card: in a matter-filled universe the expansion rate falls over time, so the slope flattens even as distances grow.' },
]

const PHYSICS = [
  { title: 'Hubble’s law', body: 'Recession speed rises in proportion to distance. That linearity is exactly what makes the expansion look the same from every galaxy, with no special point anywhere.', eq: String.raw`v=H(t)\,d` },
  { title: 'The scale factor', body: 'All cosmological distances are one comoving number times a single function of time. Comoving coordinates stay fixed; a(t) does the expanding. Here a grows as t to the two-thirds, the matter-dominated solution.', eq: String.raw`d_{\text{proper}}(t)=a(t)\,d_{\text{comoving}},\qquad a\propto t^{2/3}` },
  { title: 'The Hubble parameter changes', body: 'H is the fractional growth rate. For matter-dominated expansion it falls as one over time, so the “Hubble constant” is only constant across space, not through time.', eq: String.raw`H(t)=\frac{\dot a}{a}=\frac{2}{3t}` },
  { title: 'Cosmological redshift', body: 'Not a Doppler shift through space. The wavelength is stretched by the same factor the universe grew by while the light was in flight.', eq: String.raw`1+z=\frac{a(t_{\text{obs}})}{a(t_{\text{emit}})}` },
  { title: 'Hubble time and radius', body: 'The inverse of the Hubble constant is roughly the age of the universe. Multiply by c and you get the distance at which recession reaches light speed, which relativity allows because space itself is expanding.', eq: String.raw`t_{H}=\frac{1}{H_{0}}\approx 14\,\text{Gyr},\qquad R_{H}=\frac{c}{H_{0}}` },
]

const CONTROLS = [
  { key: 'time', label: 'Cosmic time', min: 0.25, max: 2.2, step: 0.01, unit: '', format: (v) => `${v.toFixed(2)} t₀` },
  { key: 'running', label: 'Clock', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'running' : 'paused') },
  { key: 'observer', label: 'Observer galaxy', min: 0, max: 10, step: 1, unit: '', format: (v) => `#${v}` },
  { key: 'arrows', label: 'Velocity arrows', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
  { key: 'grid', label: 'Comoving grid', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
]

export default function CosmicExpansion({ onSwitchSim }) {
  const [p, setP] = useState({ time: 1, running: 1, observer: 0, arrows: 1, grid: 1 })
  // Dragging a value that an automatic mode is driving hands control to you.
  const set = (k, v) => setP((q) => ({ ...q, [k]: v, ...(k === 'time' ? { running: 0 } : {}) }))
  const galaxies = useMemo(() => makeGalaxies(), [])
  const [stats, setStats] = useState({ a: 1, H: H0, maxV: 0 })
  const { canvasRef, ctxRef } = useCurveCanvas()
  const reportRef = useRef(0)

  // The scale factor lives in a ref so the clock can advance every frame
  // without re-rendering React sixty times a second.
  const aRef = useRef(scaleAt(p.time))
  const tRef = useRef(p.time)
  const paramsRef = useRef(p)
  paramsRef.current = p

  // Observers spread across the lattice rather than eleven adjacent ones.
  const observerIndex = Math.round((p.observer / 10) * (COUNT - 1) * 0.97 + 13) % COUNT

  const onFrame = (samples, a, H) => {
    drawHubble(ctxRef.current, samples, H)
    const now = performance.now()
    if (now - reportRef.current > 150) {
      reportRef.current = now
      let maxV = 0
      for (let i = 1; i < samples.length; i += 2) maxV = Math.max(maxV, samples[i])
      setStats({ a, H, maxV })
    }
  }

  const z = redshiftFrom(stats.a)
  const readouts = [
    { label: 'Scale factor a', value: stats.a.toFixed(3) },
    { label: 'Hubble parameter H(t)', value: `${stats.H.toFixed(1)} km/s/Mpc` },
    { label: 'Light emitted now, seen today', value: z >= 0 ? `z = ${z.toFixed(3)}` : 'not yet emitted' },
    { label: 'Hubble time today', value: `${hubbleTimeGyr().toFixed(1)} Gyr` },
    { label: 'Hubble radius today', value: `${(hubbleRadiusMpc() / 1000).toFixed(2)} Gpc` },
    { label: 'Fastest recession in view', value: `${Math.round(stats.maxV).toLocaleString()} km/s` },
    { label: 'Lattice spacing', value: `${(MPC_PER_UNIT * stats.a).toFixed(0)} Mpc` },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="cosmicExpansion" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Cosmic expansion" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 6.5, 12.5], fov: 50, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.7]}
      >
        <color attach="background" args={['#04050c']} />
        <StarsBackdrop />
        <Clock paramsRef={paramsRef} tRef={tRef} aRef={aRef} />
        {p.grid > 0.5 && <ComovingGrid aRef={aRef} observer={observerIndex} galaxies={galaxies} />}
        <Universe
          galaxies={galaxies} aRef={aRef} tRef={tRef} observer={observerIndex}
          showArrows={p.arrows > 0.5} onFrame={onFrame}
        />
        {/* The observer sits at the origin by construction. */}
        <sprite scale={[0.06, 0.06, 1]}>
          <spriteMaterial map={getRingTexture()} color={ACCENT} sizeAttenuation={false} depthWrite={false} />
        </sprite>
        <Html position={[0, 0.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="ss-tag">you are here</span>
        </Html>
        <MainCamera x={150} y={60} />
        <OrbitControls
          makeDefault enableRotate enableZoom enablePan={false} enableDamping
          dampingFactor={0.08} minDistance={2.5} maxDistance={40} rotateSpeed={0.6}
          autoRotate autoRotateSpeed={0.25}
        />
      </Canvas>
      <CurveCard canvasRef={canvasRef} title="Hubble diagram" note="measured speed against distance, with peculiar motions" />
      <div className="sim2-hud">
        <div className="sim2-hud-item"><span className="sim2-hud-label">a(t)</span><span className="sim2-hud-value">{stats.a.toFixed(3)}</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">H</span><span className="sim2-hud-value">{stats.H.toFixed(0)} km/s/Mpc</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">observer</span><span className="sim2-hud-value">galaxy #{p.observer}</span></div>
      </div>
    </div>
  )
}
