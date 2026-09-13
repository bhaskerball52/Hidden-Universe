import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import { CurveCard, MainCamera } from '../shared/StellarScene'
import { drawCurve, useCurveCanvas } from '../shared/lightCurve'
import '../shared/simBase.css'
import { rng } from '../AsteroidBelt/belt'
import { rocheFluid, rocheRigid } from './tides'

const ACCENT = '#38bdf8'
const R_PLANET = 1.4            // scene units
const DEBRIS = 1400

// Continents, painted once into an equirectangular texture by sampling 3D
// value noise on the unit sphere, so there is no seam and no pole pinch.
let landTexture = null
function getLandTexture() {
  if (landTexture) return landTexture
  const W = 512, H = 256
  const rand = rng(31337)
  const perm = new Uint8Array(512)
  for (let i = 0; i < 256; i++) perm[i] = i
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]] }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i]
  const h = (x, y, z) => perm[(perm[(perm[x & 255] + y) & 255] + z) & 255] / 255
  const smooth = (t) => t * t * (3 - 2 * t)
  const noise = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi)
    const L = (a, b, t) => a + (b - a) * t
    return L(
      L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
      w,
    )
  }
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')
  const img = g.createImageData(W, H)
  for (let py = 0; py < H; py++) {
    const lat = (0.5 - (py + 0.5) / H) * Math.PI
    for (let px = 0; px < W; px++) {
      const lon = ((px + 0.5) / W) * Math.PI * 2
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon)
      let n = 0, amp = 0.5, f = 1.6
      for (let o = 0; o < 5; o++) { n += amp * noise(x * f + 11, y * f + 7, z * f + 3); amp *= 0.5; f *= 2.1 }
      const polar = Math.abs(y) > 0.9
      const land = n > 0.53
      const o = (py * W + px) * 4
      const shade = 0.8 + 0.4 * (n - 0.5)
      const [r, gg, b] = polar ? [226, 236, 244] : land ? (n > 0.62 ? [150, 128, 96] : [74, 122, 70]) : [16, 48, 92]
      img.data[o] = r * shade; img.data[o + 1] = gg * shade; img.data[o + 2] = b * shade; img.data[o + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  landTexture = new THREE.CanvasTexture(c)
  landTexture.colorSpace = THREE.SRGBColorSpace
  return landTexture
}

// The planet, with its two tidal bulges. The bulge is a prolate deformation
// along the line of centres, which is why there are two of them and why a given
// point passes through two high tides per rotation.
function Planet({ paramsRef, angleRef, spinRef, onGauge }) {
  const bodyRef = useRef(null)
  const geo = useMemo(() => new THREE.SphereGeometry(R_PLANET, 64, 40), [])
  const basePos = useMemo(() => {
    const a = geo.attributes.position.array.slice()
    // Unit normals, cached once so the per-frame loop allocates nothing.
    for (let i = 0; i < a.length; i += 3) {
      const l = Math.hypot(a[i], a[i + 1], a[i + 2])
      a[i] /= l; a[i + 1] /= l; a[i + 2] /= l
    }
    return a
  }, [geo])
  const oceanRef = useRef(null)
  const land = getLandTexture()

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const q = paramsRef.current
    spinRef.current += dt * q.spin * 0.5
    if (bodyRef.current) bodyRef.current.rotation.y = spinRef.current
    const bulge = bulgeFor(q.distance)
    const ma = angleRef.current
    const ax = Math.cos(ma), az = Math.sin(ma)
    const mesh = oceanRef.current
    if (mesh) {
      const pos = mesh.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const nx = basePos[i * 3], ny = basePos[i * 3 + 1], nz = basePos[i * 3 + 2]
        // P2 Legendre: the equilibrium tide is a cos^2 shape, giving two bulges.
        const c = nx * ax + nz * az
        const hgt = R_PLANET * (1 + bulge * (1.5 * c * c - 0.5))
        pos.array[i * 3] = nx * hgt
        pos.array[i * 3 + 1] = ny * hgt
        pos.array[i * 3 + 2] = nz * hgt
      }
      pos.needsUpdate = true
      mesh.geometry.computeVertexNormals()
    }
    // Sea level at the gauge on the equator. Rotating by +theta about y carries
    // local +x to angle -theta in the xz plane.
    const c = Math.cos(-spinRef.current - ma)
    onGauge(bulge * (1.5 * c * c - 0.5))
  })

  return (
    <>
      <group ref={bodyRef}>
        <mesh>
          <sphereGeometry args={[R_PLANET * 0.985, 64, 40]} />
          <meshStandardMaterial map={land} roughness={0.9} metalness={0} />
        </mesh>
        {/* Tide gauge: a marker fixed to the crust, riding through both bulges. */}
        <mesh position={[R_PLANET * 1.02, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.07, 0.32, 16]} />
          <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.6} />
        </mesh>
      </group>
      {/* The deformable ocean layer, drawn over the solid body. */}
      <mesh ref={oceanRef} geometry={geo}>
        <meshStandardMaterial color="#5cc8ff" transparent opacity={0.34} roughness={0.2} metalness={0.1} depthWrite={false} />
      </mesh>
    </>
  )
}

function Moon({ distance, angle, disrupted, densityRatio }) {
  const ref = useRef(null)
  const debrisRef = useRef(null)
  const stateRef = useRef(null)

  if (stateRef.current === null) {
    const rand = rng(77042)
    const a = new Float32Array(DEBRIS)
    const ph = new Float32Array(DEBRIS)
    const yy = new Float32Array(DEBRIS)
    for (let i = 0; i < DEBRIS; i++) {
      a[i] = 0.82 + rand() * 0.45     // spread in radius once torn apart
      ph[i] = rand() * Math.PI * 2
      yy[i] = (rand() - 0.5) * 0.1
    }
    stateRef.current = { a, ph, yy, positions: new Float32Array(DEBRIS * 3), t: 0 }
  }
  const S = stateRef.current

  const debrisGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(S.positions, 3))
    return g
  }, [S])

  useFrame((_, dt) => {
    const dScene = distance * R_PLANET
    const mx = Math.cos(angle) * dScene
    const mz = Math.sin(angle) * dScene
    if (ref.current) {
      ref.current.position.set(mx, 0, mz)
      ref.current.visible = !disrupted
      // Even before disruption the moon is stretched by the tide it feels.
      const stretch = 1 + Math.min(0.55, Math.pow(1.15 / Math.max(distance, 0.9), 3) * 0.8)
      ref.current.scale.set(stretch, 1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch))
      ref.current.rotation.y = angle
    }
    if (debrisRef.current) debrisRef.current.visible = disrupted
    if (!disrupted) return

    // Once torn apart the fragments shear out into a ring: inner debris orbits
    // faster than outer, which is exactly how ring systems flatten and spread.
    S.t += dt
    for (let i = 0; i < DEBRIS; i++) {
      const r = dScene * S.a[i]
      const n = Math.pow(r, -1.5) * 2.2          // Keplerian shear
      const th = S.ph[i] + S.t * n
      S.positions[i * 3] = Math.cos(th) * r
      S.positions[i * 3 + 1] = S.yy[i]
      S.positions[i * 3 + 2] = Math.sin(th) * r
    }
    debrisGeo.attributes.position.needsUpdate = true
  })

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.3, 26, 20]} />
        <meshStandardMaterial
          color={densityRatio > 1 ? '#cbd5e1' : '#e2e8f0'}
          roughness={0.9}
        />
      </mesh>
      <points ref={debrisRef} geometry={debrisGeo}>
        <pointsMaterial color="#dbeafe" size={0.045} transparent opacity={0.85} sizeAttenuation />
      </points>
    </>
  )
}

// The Roche limit itself, drawn as a circle you can watch the moon cross.
function RocheRing({ radius, danger, label }) {
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(t), 0, Math.sin(t)))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  return (
    <group>
      <line geometry={geo} scale={[radius, 1, radius]}>
        <lineBasicMaterial color={danger ? '#f87171' : '#94a3b8'} transparent opacity={danger ? 0.9 : 0.5} />
      </line>
      {label && (
        <Html position={[-radius * 0.7071, 0, radius * 0.7071]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="ss-tag" style={danger ? { borderColor: '#f87171', color: '#fecaca' } : undefined}>{label}</span>
        </Html>
      )}
    </group>
  )
}

// The moon's own orbit, faint, so its distance reads against the Roche limit.
function MoonOrbit({ radius }) {
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(t), 0, Math.sin(t)))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  return (
    <line geometry={geo} scale={[radius, 1, radius]} onUpdate={(l) => l.computeLineDistances()}>
      <lineDashedMaterial color="#e2e8f0" dashSize={0.06} gapSize={0.05} transparent opacity={0.28} />
    </line>
  )
}

// Hoisted: declaring a component inside another makes a new component type on
// every render, remounting it and resetting the orbit each time.
function Orbiter({ paramsRef, angleRef, reportRef, onAngle }) {
  useFrame((_, dt) => {
    const q = paramsRef.current
    // Kepler's third law: angular speed falls as distance^-1.5.
    if (q.orbit > 0.5) angleRef.current += Math.min(dt, 0.05) * 1.9 * Math.pow(q.distance / 3.6, -1.5)
    const now = performance.now()
    if (now - reportRef.current > 60) { reportRef.current = now; onAngle(angleRef.current) }
  }, -1)
  return null
}

// Equilibrium bulge height as a fraction of the radius, exaggerated enormously
// so it is visible: Earth's real ocean tide is about 5e-8 of its radius. The
// d^-3 dependence is the physical part.
const bulgeFor = (distance) => Math.min(0.3, Math.pow(2.2 / distance, 3) * 0.45)

const INTRO = [
  { title: 'Why are there two bulges?', body: 'Tides come from the difference in gravity across a body, not the pull toward the moon. The near side is pulled harder than the centre, the far side less, so the body stretches both ways.' },
  { title: 'Why two tides a day?', body: 'Because there are two bulges. As the planet rotates, any point on it passes through both, so it gets a high tide roughly every twelve hours rather than every twenty-four.' },
  { title: 'What is the Roche limit?', body: 'The distance where the tidal stretch beats the moon’s own gravity holding it together. Bring the moon inside the red circle and it comes apart.' },
  { title: 'Why does it become a ring?', body: 'The fragments keep orbiting, but inner pieces orbit faster than outer ones. That shear smears the debris into a ring, which is where Saturn’s rings came from.' },
]

const PHYSICS = [
  { title: 'The tidal force is a difference', body: 'Subtract the pull at the centre from the pull at the surface. It falls off as the cube of distance, not the square, which is why a nearby small body beats a distant huge one.', eq: String.raw`a_{\text{tide}}\approx\frac{2GMr}{d^{3}}` },
  { title: 'Why the Moon beats the Sun', body: 'The Sun pulls on Earth about 175 times harder than the Moon does, but the cube law wins: the Moon raises a tide roughly 2.2 times larger.', eq: String.raw`\frac{a_{\text{Moon}}}{a_{\text{Sun}}}=\frac{M_{M}}{M_{S}}\left(\frac{d_{S}}{d_{M}}\right)^{3}\approx 2.2` },
  { title: 'The Roche limit', body: 'Set the tidal stretch equal to the moon’s self-gravity. What survives is a pure density ratio: a denser moon can orbit closer before breaking up.', eq: String.raw`d_{\text{Roche}}\approx 2.44\,R_{P}\left(\frac{\rho_{P}}{\rho_{M}}\right)^{1/3}` },
  { title: 'Rings, not moons', body: 'Saturn’s B ring lies well inside its Roche limit, so those particles can never gather into a moon. Titan, far outside it, formed without trouble.', eq: String.raw`d<d_{\text{Roche}}\;\Rightarrow\;\text{ring};\qquad d>d_{\text{Roche}}\;\Rightarrow\;\text{moon}` },
]

const CONTROLS = [
  { key: 'distance', label: 'Moon distance', min: 1.8, max: 9, step: 0.05, unit: ' Rp' },
  { key: 'densityRatio', label: 'Moon density ρM/ρP', min: 0.3, max: 3, step: 0.05, unit: '' },
  { key: 'spin', label: 'Planet spin', min: 0, max: 3, step: 0.05, unit: '×' },
  { key: 'orbit', label: 'Moon orbit', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'running' : 'paused') },
]

export default function TidesRoche({ onSwitchSim }) {
  const [p, setP] = useState({ distance: 5, densityRatio: 0.6, spin: 1, orbit: 1 })
  const set = (k, v) => setP((q) => ({ ...q, [k]: v }))
  const [angle, setAngle] = useState(0)
  const angleRef = useRef(0)
  const paramsRef = useRef(p)
  paramsRef.current = p
  const reportRef = useRef(0)

  // Roche limits in planet radii, from the density ratio only.
  const roche = rocheFluid(1, 1, p.densityRatio)
  const rocheR = rocheRigid(1, 1, p.densityRatio)
  const disrupted = p.distance < roche
  const bulge = bulgeFor(p.distance)
  const spinRef = useRef(0)
  const { canvasRef, ctxRef } = useCurveCanvas()
  const gaugeRef = useRef(null)
  if (gaugeRef.current === null) gaugeRef.current = { hist: new Float32Array(300).fill(NaN), n: 0, acc: 0, bins: new Float32Array(1).fill(NaN) }
  const [gauge, setGauge] = useState(0)
  const gaugeReport = useRef(0)
  const onGauge = (hgt) => {
    const G = gaugeRef.current
    // One sample every other frame keeps about five seconds on the card.
    if (G.n === 0) G.hist.fill(hgt)
    G.acc++
    if (G.acc % 2 === 0) {
      G.hist.copyWithin(0, 1)
      G.hist[G.hist.length - 1] = hgt
      G.n++
    }
    const b = bulgeFor(paramsRef.current.distance)
    drawCurve(ctxRef.current, {
      model: G.hist, bins: G.bins,
      cursor: { x: 1, flux: hgt },
      yMin: -0.55 * Math.max(b, 0.02), yMax: 1.05 * Math.max(b, 0.02),
      color: '#f87171',
      yFormat: (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`,
    })
    const now = performance.now()
    if (now - gaugeReport.current > 120) { gaugeReport.current = now; setGauge(hgt) }
  }

  const readouts = [
    { label: 'Moon distance', value: `${p.distance.toFixed(2)} Rp` },
    { label: 'Roche limit (fluid)', value: `${roche.toFixed(2)} Rp` },
    { label: 'Roche limit (rigid)', value: `${rocheR.toFixed(2)} Rp` },
    { label: 'Status', value: disrupted ? 'torn apart' : 'intact' },
    { label: 'Tidal force vs at 5 Rp', value: `${Math.pow(5 / p.distance, 3).toFixed(2)}×` },
    { label: 'Bulge height (exaggerated)', value: `${(bulge * 100).toFixed(1)}% of radius` },
    { label: 'Sea level at the gauge', value: `${gauge >= 0 ? '+' : ''}${(gauge * 100).toFixed(2)}%` },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="tidesRoche" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Tides and the Roche limit" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 9.5, 14.5], fov: 48, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.7]}
      >
        <color attach="background" args={['#04070f']} />
        <Stars radius={110} depth={60} count={1200} factor={3} saturation={0} fade speed={0.2} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[6, 6, 4]} intensity={1.6} color="#fff2e0" />
        <Orbiter paramsRef={paramsRef} angleRef={angleRef} reportRef={reportRef} onAngle={setAngle} />
        <Planet paramsRef={paramsRef} angleRef={angleRef} spinRef={spinRef} onGauge={onGauge} />
        <RocheRing radius={roche * R_PLANET} danger={disrupted} label="Roche limit" />
        {!disrupted && <MoonOrbit radius={p.distance * R_PLANET} />}
        <MainCamera x={150} y={110} />
        <Moon distance={p.distance} angle={angle} disrupted={disrupted} densityRatio={p.densityRatio} />
        <OrbitControls
          makeDefault enableRotate enableZoom enablePan={false} enableDamping
          dampingFactor={0.08} minDistance={4} maxDistance={30} rotateSpeed={0.6}
        />
      </Canvas>
      <CurveCard canvasRef={canvasRef} title="Sea level at the red gauge" note="two high tides per rotation" />
      <div className="sim2-hud">
        <div className="sim2-hud-item"><span className="sim2-hud-label">distance</span><span className="sim2-hud-value">{p.distance.toFixed(2)} Rp</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">Roche limit</span><span className="sim2-hud-value">{roche.toFixed(2)} Rp</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">moon</span><span className="sim2-hud-value">{disrupted ? 'torn apart' : 'intact'}</span></div>
      </div>
    </div>
  )
}
