import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import { Glow, MainCamera, StarBody, StarsBackdrop } from '../shared/StellarScene'
import '../shared/simBase.css'
import {
  period, perihelion, aphelion, angularMomentum, stateAt, radiusAt,
} from './orbit'

const ACCENT = '#ffb347'

// Ellipse outline, sampled in true anomaly. The focus sits at the origin, which
// is the whole point: the star is at a focus, not the centre.
function useEllipse(a, e) {
  return useMemo(() => {
    const pts = []
    for (let i = 0; i <= 240; i++) {
      const nu = (i / 240) * Math.PI * 2
      const r = radiusAt(a, e, nu)
      pts.push(new THREE.Vector3(r * Math.cos(nu), 0, r * Math.sin(nu)))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [a, e])
}

// Equal-time sectors. Each wedge covers one twelfth of the period, so their
// areas are identical however lopsided they look. That is the second law.
function SweepSectors({ a, e, show }) {
  const geo = useMemo(() => {
    if (!show) return null
    const T = period(a)
    const N = 12
    const g = []
    for (let k = 0; k < N; k++) {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      const steps = 22
      for (let i = 0; i <= steps; i++) {
        const t = ((k + i / steps) / N) * T
        const s = stateAt(t, a, e)
        shape.lineTo(s.x, s.y)
      }
      shape.lineTo(0, 0)
      g.push(new THREE.ShapeGeometry(shape))
    }
    return g
  }, [a, e, show])

  if (!geo) return null
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {geo.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial
            color={i % 2 ? '#ffb347' : '#ff7e5f'}
            transparent
            opacity={0.13}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

const TRAIL_POINTS = 160

function Planet({ a, e, rate, onTick }) {
  const ref = useRef(null)
  const tRef = useRef(0)
  // Lazily-initialised ref rather than useMemo: this buffer is written every
  // frame, and a ref is the thing that is allowed to be mutated after render.
  const trailRef = useRef(null)
  if (trailRef.current === null) {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3))
    g.setDrawRange(0, 0)
    trailRef.current = { geo: g, write: 0 }
  }
  const trail = trailRef.current
  const haloRef = useRef(null)
  const radiusRef = useRef(null)
  const arrowRef = useRef(null)
  const arrow = useMemo(() => ({ args: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.5, 0x7fe3ff, 0.12, 0.08], dir: new THREE.Vector3() }), [])
  const radiusGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    return g
  }, [])

  useFrame((_, dt) => {
    tRef.current += dt * rate
    const s = stateAt(tRef.current, a, e)
    if (ref.current) ref.current.position.set(s.x, 0, s.y)
    if (haloRef.current) haloRef.current.position.set(s.x, 0, s.y)
    if (radiusRef.current) {
      const rp = radiusGeo.attributes.position
      rp.array[0] = 0; rp.array[1] = 0; rp.array[2] = 0
      rp.array[3] = s.x; rp.array[4] = 0; rp.array[5] = s.y
      rp.needsUpdate = true
    }

    // Ring buffer: one point per frame, never reallocated.
    const pos = trail.geo.attributes.position
    const i = trail.write % TRAIL_POINTS
    pos.array[i * 3] = s.x
    pos.array[i * 3 + 1] = 0
    pos.array[i * 3 + 2] = s.y
    trail.write += 1
    pos.needsUpdate = true
    trail.geo.setDrawRange(0, Math.min(trail.write, TRAIL_POINTS))

    // Velocity vector, tangent to the orbit, drawn to scale with the speed.
    if (arrowRef.current) {
      const s2 = stateAt(tRef.current + 1e-3, a, e)
      const dx = s2.x - s.x, dz = s2.y - s.y
      const len = Math.hypot(dx, dz) || 1
      arrowRef.current.position.set(s.x, 0, s.y)
      arrowRef.current.setDirection(arrow.dir.set(dx / len, 0, dz / len))
      const L = 0.25 + s.speed * 0.55
      arrowRef.current.setLength(L, 0.12, 0.08)
    }
    onTick?.(s)
  })

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color="#dbeaff" emissive="#5aa9ff" emissiveIntensity={1.3} roughness={0.35} />
      </mesh>
      {/* Halo, so the planet reads at a glance from any camera distance. */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshBasicMaterial color="#7fb8ff" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {/* The radius vector. This is the line whose swept area the second law
          is about, so showing it is the point, not decoration. */}
      <line ref={radiusRef} geometry={radiusGeo}>
        <lineBasicMaterial color="#ffd9a0" transparent opacity={0.85} />
      </line>
      <arrowHelper ref={arrowRef} args={arrow.args} />
      <points geometry={trail.geo}>
        <pointsMaterial color="#bcd8ff" size={0.055} transparent opacity={0.72} sizeAttenuation />
      </points>
    </>
  )
}

function Star() {
  return (
    <group>
      <StarBody radius={0.2} color="#fff1dc" u1={0.5} u2={0.15} />
      <Glow size={1.5} color="#ffc56e" opacity={0.7} />
      <pointLight intensity={3.2} distance={40} decay={2} color="#ffd9a0" />
    </group>
  )
}

// Code units have GM = 1, so a = 1 gives a period of 2π. Reading a as AU around
// a solar-mass star, that 2π is one year and unit speed is Earth's 29.78 km/s.
const YEAR = 2 * Math.PI
const V_EARTH = 29.78

// The geometry the first law is about: both foci, the centre, and the two
// apsides, labelled where they sit.
function Landmarks({ a, e }) {
  const c = a * e
  const tag = (text, pos) => (
    <Html position={pos} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <span className="ss-tag">{text}</span>
    </Html>
  )
  return (
    <group>
      <mesh position={[a * (1 - e), 0, 0]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshBasicMaterial color="#ffd9a0" />
      </mesh>
      <mesh position={[-a * (1 + e), 0, 0]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshBasicMaterial color="#9fb8ff" />
      </mesh>
      {/* The empty focus: nothing is there, which is the point. */}
      <mesh position={[-2 * c, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.16, 0.018, 0.018]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[-2 * c, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.16, 0.018, 0.018]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>
      {tag('perihelion', [a * (1 - e) + 0.05, 0.28, 0])}
      {tag('aphelion', [-a * (1 + e), 0.28, 0])}
      {e > 0.08 && tag('empty focus', [-2 * c, -0.3, 0])}
    </group>
  )
}

const INTRO = [
  {
    title: 'What am I looking at?',
    body: 'One small body orbiting one massive one. The star sits at a focus of the ellipse, not at its centre, which is Kepler’s first law and the thing most diagrams get wrong.',
  },
  {
    title: 'Why the coloured wedges?',
    body: 'Each wedge is swept out in exactly one twelfth of the orbital period. They look wildly different in shape, but every one has the same area. That is the second law.',
  },
  {
    title: 'Why does it speed up?',
    body: 'Angular momentum is conserved, so when the planet falls closer to the star it must move faster. The speed readout comes from the vis-viva equation, not from an animation curve.',
  },
  {
    title: 'What can I change?',
    body: 'Eccentricity reshapes the ellipse, the semi-major axis sets its size, and the time rate speeds the clock. Watch the period: it tracks the semi-major axis alone and ignores eccentricity entirely.',
  },
]

const PHYSICS = [
  {
    title: 'First law: the orbit is an ellipse',
    body: 'Solving the inverse-square force law for a bound two-body system gives a conic section. For a bound orbit that is an ellipse with the primary at one focus.',
    eq: String.raw`r(\nu)=\frac{a\,(1-e^{2})}{1+e\cos\nu}`,
  },
  {
    title: 'Second law: equal areas in equal times',
    body: 'The rate of area sweep is half the specific angular momentum, and gravity is a central force so it exerts no torque. The sweep rate is therefore constant.',
    eq: String.raw`\frac{dA}{dt}=\frac{1}{2}r^{2}\dot{\nu}=\frac{h}{2}=\text{constant}`,
  },
  {
    title: 'Third law: period from the semi-major axis',
    body: 'The period depends on the semi-major axis alone. Two orbits with the same a but wildly different eccentricity take exactly the same time to come round.',
    eq: String.raw`T=2\pi\sqrt{\frac{a^{3}}{GM}}`,
  },
  {
    title: 'Vis-viva: speed at any radius',
    body: 'From conservation of energy. This is what drives the speed readout, and why the planet is fastest at perihelion and slowest at aphelion.',
    eq: String.raw`v=\sqrt{GM\left(\frac{2}{r}-\frac{1}{a}\right)}`,
  },
  {
    title: 'Kepler’s equation',
    body: 'Position in time has no closed form, so the scene solves this transcendental equation for the eccentric anomaly each frame by Newton-Raphson, then converts to a true anomaly.',
    eq: String.raw`M=E-e\sin E`,
  },
]

const CONTROLS = [
  { key: 'e', label: 'Eccentricity', min: 0, max: 0.92, step: 0.01, unit: '' },
  { key: 'a', label: 'Semi-major axis', min: 1.2, max: 4, step: 0.05, unit: ' AU' },
  { key: 'rate', label: 'Time rate', min: 0.05, max: 2.5, step: 0.05, unit: '×' },
  { key: 'sweeps', label: 'Equal-area wedges', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
]

export default function KeplerOrbits({ onSwitchSim }) {
  const [p, setP] = useState({ e: 0.6, a: 2.2, rate: 1.1, sweeps: 1 })
  const set = (k, v) => setP((q) => ({ ...q, [k]: v }))
  const [live, setLive] = useState({ r: 0, speed: 0 })
  const lastRef = useRef(0)

  const ellipse = useEllipse(p.a, p.e)

  // Throttle the readout to ~12 Hz: the numbers are unreadable faster than that
  // and re-rendering the panel every frame is wasted work.
  const onTick = (s) => {
    const now = performance.now()
    if (now - lastRef.current > 80) {
      lastRef.current = now
      setLive({ r: s.r, speed: s.speed })
    }
  }

  const T = period(p.a) / YEAR
  const readouts = [
    { label: 'Period', value: `${T.toFixed(2)} yr` },
    { label: 'Perihelion', value: `${perihelion(p.a, p.e).toFixed(2)} AU` },
    { label: 'Aphelion', value: `${aphelion(p.a, p.e).toFixed(2)} AU` },
    { label: 'Current radius', value: `${live.r.toFixed(2)} AU` },
    { label: 'Current speed', value: `${(live.speed * V_EARTH).toFixed(1)} km/s` },
    { label: 'Perihelion / aphelion speed', value: `${(Math.sqrt((1 + p.e) / (1 - p.e))).toFixed(2)}×` },
    { label: 'Angular momentum', value: angularMomentum(p.a, p.e).toFixed(3) },
    { label: 'Area per wedge', value: (Math.PI * p.a * p.a * Math.sqrt(1 - p.e * p.e) / 12).toFixed(3) },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="keplerOrbits" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Kepler orbits"
        accent={ACCENT}
        intro={INTRO}
        controls={CONTROLS}
        physics={PHYSICS}
        values={p}
        onChange={set}
        readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 5.2, 6.4], fov: 48, near: 0.05, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.8]}
      >
        <color attach="background" args={['#04060d']} />
        <StarsBackdrop />
        <MainCamera x={150} y={20} />
        <ambientLight intensity={0.28} />
        <Star />
        <SweepSectors a={p.a} e={p.e} show={p.sweeps > 0.5} />
        <Landmarks a={p.a} e={p.e} />
        <line geometry={ellipse}>
          <lineBasicMaterial color={ACCENT} transparent opacity={0.65} />
        </line>
        <Planet a={p.a} e={p.e} rate={p.rate} onTick={onTick} />
        <OrbitControls
          makeDefault enableRotate enableZoom enablePan={false} enableDamping
          dampingFactor={0.08} minDistance={3} maxDistance={26} rotateSpeed={0.6}
        />
      </Canvas>
      <div className="sim2-hud">
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">speed</span>
          <span className="sim2-hud-value">{(live.speed * V_EARTH).toFixed(1)} km/s</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">radius</span>
          <span className="sim2-hud-value">{live.r.toFixed(2)} AU</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">period</span>
          <span className="sim2-hud-value">{T.toFixed(2)} yr</span>
        </div>
      </div>
    </div>
  )
}
