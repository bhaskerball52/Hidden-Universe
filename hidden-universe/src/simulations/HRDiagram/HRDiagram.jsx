import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import { CurveCard, MainCamera, Glow, SCENERY, StarBody, StarsBackdrop } from '../shared/StellarScene'
import { useCurveCanvas } from '../shared/lightCurve'
import '../shared/simBase.css'
import { rng } from '../AsteroidBelt/belt'
import { blackbodyColor } from '../BlackbodySpectra/planck'
import {
  SUN_T, luminosityOf, temperatureOf, radiusFrom, lifetimeOf, evolvedState, spectralClass,
} from './stellar'

const ACCENT = '#fbbf24'

// Axis ranges. Temperature runs hot-to-cold left-to-right, which is the
// convention and the reason the diagram looks backwards at first.
const T_HI = 100000, T_LO = 2600
const L_LO = 1e-4, L_HI = 1e6

const INTRO = [
  { title: 'What am I looking at?', body: 'On the left, every star plotted by surface temperature against luminosity. On the right, the one star you are following, drawn in its true colour beside the Sun at the same scale.' },
  { title: 'Why is the axis backwards?', body: 'Temperature increases to the left. The diagram was built from spectral classes, O B A F G K M, long before anyone could measure a temperature, and the ordering stuck.' },
  { title: 'What is the track?', body: 'The bright line is one star of the mass you choose, walking its whole life: main sequence, swelling to a red giant, then either shedding a planetary nebula and cooling as a white dwarf or, above eight solar masses, ending as a supernova.' },
  { title: 'What can I change?', body: 'Mass sets where the star starts and how fast it burns. Push the clock forward to watch it evolve, and watch the Sun beside it shrink to a speck when it becomes a giant. The faint diagonals are lines of constant radius.' },
]

const PHYSICS = [
  { title: 'Mass-luminosity relation', body: 'A main-sequence star’s output is set almost entirely by its mass. The exponent is near four in the middle of the range, which is why small mass differences give huge brightness differences.', eq: String.raw`L\propto M^{\alpha},\qquad \alpha\approx 4\;(0.43<M/M_{\odot}<2)` },
  { title: 'Stefan-Boltzmann', body: 'Luminosity is surface area times flux per unit area. This is what makes the diagonal contours, and it is how the 3D star’s size is computed from the point on the diagram.', eq: String.raw`L=4\pi R^{2}\sigma T_{\text{eff}}^{4}\;\Rightarrow\;\frac{R}{R_{\odot}}=\sqrt{\frac{L}{L_{\odot}}}\left(\frac{T_{\odot}}{T}\right)^{2}` },
  { title: 'Main-sequence lifetime', body: 'Fuel scales with mass, burn rate with luminosity. Since luminosity climbs much faster than mass, massive stars live spectacularly short lives.', eq: String.raw`t_{\text{MS}}\approx 10\,\text{Gyr}\times\frac{M/M_{\odot}}{L/L_{\odot}}\propto M^{-3}` },
  { title: 'Why stars leave the band', body: 'When core hydrogen runs out the core contracts and the envelope expands. The star cools at its surface but grows enormously, so it moves up and to the right into the giant branch.', eq: String.raw`R\uparrow\uparrow,\;T_{\text{eff}}\downarrow\;\Rightarrow\;L=4\pi R^{2}\sigma T^{4}\uparrow` },
  { title: 'White dwarfs', body: 'The exposed core is held up by electron degeneracy pressure, not heat. It packs about half a solar mass into something the size of Earth and simply cools for billions of years.', eq: String.raw`R_{\text{WD}}\approx 0.01\,R_{\odot},\qquad R\propto M^{-1/3}` },
]

const CONTROLS = [
  { key: 'mass', label: 'Stellar mass', min: 0.1, max: 30, step: 0.1, unit: ' M☉' },
  { key: 'age', label: 'Life elapsed', min: 0, max: 1, step: 0.005, unit: '', format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'contours', label: 'Radius contours', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
  { key: 'evolve', label: 'Auto-advance', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'running' : 'paused') },
]

const rgbCss = (T, a = 1) => {
  const [r, g, b] = blackbodyColor(T)
  return `rgba(${r},${g},${b},${a})`
}

// Background population: a realistic HR field so the main sequence is a band
// of many stars rather than a drawn line. Built once, on first use.
let field = null
function getField() {
  if (field) return field
  const rand = rng(19061104)
  const pts = []
  for (let i = 0; i < 2600; i++) {
    // Initial mass function: many small stars, few large ones.
    const m = 0.1 * Math.pow(1 - rand() * 0.985, -1 / 1.35)
    if (m > 45) continue
    // Scatter from age, metallicity and binarity widens the band, as in real data.
    const L = luminosityOf(m) * Math.pow(10, (rand() - 0.35) * 0.45)
    const T = temperatureOf(m) * Math.pow(10, (rand() - 0.5) * 0.04)
    pts.push({ L, T, r: 1.5, fill: rgbCss(T, 0.7) })
  }
  // Giants and white dwarfs, so the other two populations are present.
  for (let i = 0; i < 260; i++) {
    const T = 3400 + rand() * 1700
    pts.push({ L: Math.pow(10, 1.4 + rand() * 1.9), T, r: 2.2, fill: rgbCss(T, 0.6) })
  }
  for (let i = 0; i < 200; i++) {
    const T = 6000 + rand() * 22000
    pts.push({ L: Math.pow(10, -3.4 + rand() * 1.9), T, r: 1.4, fill: rgbCss(T, 0.6) })
  }
  field = pts
  return field
}

const PAD = { l: 50, r: 10, t: 8, b: 34 }
const plotX = (W) => (T) => PAD.l + ((Math.log10(T_HI) - Math.log10(T)) / (Math.log10(T_HI) - Math.log10(T_LO))) * (W - PAD.l - PAD.r)
const plotY = (H) => (L) => PAD.t + ((Math.log10(L_HI) - Math.log10(L)) / (Math.log10(L_HI) - Math.log10(L_LO))) * (H - PAD.t - PAD.b)
const clampT = (T) => Math.max(T_LO, Math.min(T_HI, T))
const clampL = (L) => Math.max(L_LO, Math.min(L_HI, L))

// Everything except the moving marker, redrawn only when the size, mass or
// contour toggle changes. Three thousand dots per frame would be wasted work.
function drawStaticLayer(off, W, H, q) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  off.width = Math.round(W * dpr)
  off.height = Math.round(H * dpr)
  const ctx = off.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const X = plotX(W), Y = plotY(H)

  ctx.font = '10.5px ui-sans-serif, system-ui, sans-serif'
  ctx.lineWidth = 1
  for (let e = -4; e <= 6; e += 2) {
    const y = Y(Math.pow(10, e))
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke()
    ctx.fillStyle = 'rgba(230,239,255,0.5)'
    ctx.fillText(`10${e < 0 ? '⁻' : ''}${String(Math.abs(e)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`, 20, y + 3.5)
  }
  for (const T of [100000, 40000, 20000, 10000, 5000, 3000]) {
    const x = X(T)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, H - PAD.b); ctx.stroke()
    const label = `${T / 1000}k`
    ctx.fillStyle = 'rgba(230,239,255,0.5)'
    ctx.fillText(label, x - ctx.measureText(label).width / 2, H - PAD.b + 14)
    ctx.fillStyle = 'rgba(230,239,255,0.32)'
    ctx.fillText(spectralClass(T), x - 3, H - PAD.b + 28)
  }
  ctx.save()
  ctx.translate(11, PAD.t + (H - PAD.t - PAD.b) / 2); ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = 'rgba(230,239,255,0.5)'
  ctx.fillText('Luminosity (L☉)', -38, 0)
  ctx.restore()

  if (q.contours > 0.5) {
    ctx.strokeStyle = 'rgba(120,180,255,0.2)'
    ctx.fillStyle = 'rgba(150,195,255,0.45)'
    ctx.setLineDash([4, 5])
    for (const R of [0.01, 0.1, 1, 10, 100, 1000]) {
      ctx.beginPath()
      let first = true, lastPt = null
      for (let i = 0; i <= 40; i++) {
        const T = T_HI * Math.pow(T_LO / T_HI, i / 40)
        const L = R * R * Math.pow(T / SUN_T, 4)
        if (L < L_LO || L > L_HI) { first = true; continue }
        const x = X(T), y = Y(L)
        if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
        if (!lastPt && y > PAD.t + 14 && x > PAD.l + 8) lastPt = [x, y]
      }
      ctx.stroke()
      if (lastPt) ctx.fillText(`${R} R☉`, lastPt[0] + 4, lastPt[1] - 4)
    }
    ctx.setLineDash([])
  }

  for (const s of getField()) {
    if (s.L < L_LO || s.L > L_HI) continue
    ctx.fillStyle = s.fill
    ctx.beginPath(); ctx.arc(X(s.T), Y(s.L), s.r, 0, Math.PI * 2); ctx.fill()
  }

  ctx.strokeStyle = 'rgba(251,191,36,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= 120; i++) {
    const st = evolvedState(q.mass, i / 120)
    const x = X(clampT(st.T)), y = Y(clampL(st.L))
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function drawHR(c, off, keyRef, q, st) {
  if (!c) return
  const { ctx, W, H } = c
  const key = `${W}x${H}:${q.contours > 0.5}:${q.mass}`
  if (keyRef.current !== key) {
    drawStaticLayer(off, W, H, q)
    keyRef.current = key
  }
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(off, 0, 0, W, H)

  const sx = plotX(W)(clampT(st.T))
  const sy = plotY(H)(clampL(st.L))
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20)
  glow.addColorStop(0, rgbCss(st.T, 0.9))
  glow.addColorStop(1, rgbCss(st.T, 0))
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = rgbCss(st.T)
  ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif'
  const w = ctx.measureText(st.phase).width
  ctx.fillText(st.phase, sx + 12 + w > W - PAD.r ? sx - 12 - w : sx + 12, Math.max(PAD.t + 12, sy - 10))
}

let ringTexture = null
function getRingTexture() {
  if (ringTexture) return ringTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.strokeStyle = '#fff'
  g.lineWidth = 6
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke()
  ringTexture = new THREE.CanvasTexture(c)
  return ringTexture
}

// Expanding shell for the planetary-nebula phase: bright at the rim, where
// the line of sight runs through the most gas, which is why real ones look
// like rings.
const SHELL_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    vec3 col = mix(vec3(0.95, 0.35, 0.45), vec3(0.35, 0.95, 0.85), rim);
    gl_FragColor = vec4(col * rim * uOpacity, 1.0);
  }
`
const SHELL_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vN = normalMatrix * normal;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

function EvolvingStar({ stateRef }) {
  const groupRef = useRef(null)
  const starRef = useRef(null)
  const glowRef = useRef(null)
  const sunRef = useRef(null)
  const sunGroupRef = useRef(null)
  const sunRingRef = useRef(null)
  const starRingRef = useRef(null)
  const shellRef = useRef(null)
  const labelRef = useRef(null)
  const logScale = useRef(Math.log(1 / 0.8))
  const ring = getRingTexture()
  const shellMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [])
  useEffect(() => () => shellMat.dispose(), [shellMat])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const { R, T, f, mass } = stateRef.current
    // The scene zooms smoothly so the larger of the star and the Sun always
    // fills the frame. Both are drawn at the same scale as each other.
    const target = Math.log(Math.max(R, 1) / 0.8)
    logScale.current += (target - logScale.current) * Math.min(1, dt * 2.5)
    const S = Math.exp(logScale.current)
    const rd = R / S, rs = 1 / S
    // Planetary nebula: a shell that expands and fades after the envelope is
    // ejected. The Sun is pushed aside so the shell never swallows it.
    const pn = mass < 8 && f >= 0.78
    const pu = pn ? (f - 0.78) / 0.22 : 0
    const shellR = 0.3 + 0.55 * Math.sqrt(pu)
    const gap = pn ? Math.max(0.55, shellR + 0.2 - rd) : 0.55
    const d = rd + gap + rs

    // Centre the pair: star at the group origin, Sun a distance d to its left.
    if (groupRef.current) groupRef.current.position.x = d / 2
    if (starRef.current) {
      starRef.current.scale.setScalar(rd)
      const [r, g, b] = blackbodyColor(T)
      const u = starRef.current.material.uniforms
      u.uColor.value.setRGB(r / 255, g / 255, b / 255)
      // Giant envelopes have a handful of enormous convection cells.
      u.uGran.value = R > 8 ? 3 : 9
    }
    if (glowRef.current) {
      const [r, g, b] = blackbodyColor(T)
      glowRef.current.material.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
      const s = rd * 3.4 + 0.35
      glowRef.current.scale.set(s, s, 1)
    }
    if (sunGroupRef.current) sunGroupRef.current.position.x = -d
    sunRef.current?.scale.setScalar(rs)
    labelRef.current?.position.set(0, -(Math.max(rs, 0.05) + 0.28), 0)
    if (sunRingRef.current) sunRingRef.current.material.opacity = rs < 0.12 ? 0.85 : 0
    if (starRingRef.current) starRingRef.current.material.opacity = rd < 0.12 ? 0.85 : 0

    if (shellRef.current) {
      shellRef.current.visible = pn
      shellRef.current.scale.setScalar(shellR)
      shellMat.uniforms.uOpacity.value = 1.5 * Math.pow(1 - pu, 1.3)
    }
  })

  return (
    <group ref={groupRef}>
      <StarBody starRef={starRef} u1={0.55} u2={0.12} />
      <Glow spriteRef={glowRef} size={5} opacity={0.5} />
      <mesh ref={shellRef} material={shellMat} visible={false}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      <sprite ref={starRingRef} scale={[0.05, 0.05, 1]} layers={SCENERY}>
        <spriteMaterial map={ring} color={ACCENT} transparent opacity={0} sizeAttenuation={false} depthWrite={false} />
      </sprite>
      <group ref={sunGroupRef}>
        <StarBody starRef={sunRef} color="#fff1ea" u1={0.55} u2={0.12} />
        <sprite ref={sunRingRef} scale={[0.05, 0.05, 1]} layers={SCENERY}>
          <spriteMaterial map={ring} color="#ffffff" transparent opacity={0} sizeAttenuation={false} depthWrite={false} />
        </sprite>
        <group ref={labelRef}>
          <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className="ss-tag">Sun, same scale</span>
          </Html>
        </group>
      </group>
    </group>
  )
}

function Clock({ paramsRef, ageRef, stateRef, onTick }) {
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const q = paramsRef.current
    if (q.evolve > 0.5) {
      ageRef.current += dt * 0.045
      if (ageRef.current > 1) ageRef.current = 0
    } else {
      ageRef.current = q.age
    }
    const st = evolvedState(q.mass, ageRef.current)
    stateRef.current = { ...st, R: radiusFrom(st.L, st.T), f: ageRef.current, mass: q.mass }
    onTick(stateRef.current)
  }, -1)
  return null
}

export default function HRDiagram({ onSwitchSim }) {
  const [p, setP] = useState({ mass: 1, age: 0, contours: 1, evolve: 1 })
  // Dragging a value that an automatic mode is driving hands control to you.
  const set = (k, v) => setP((q) => ({ ...q, [k]: v, ...(k === 'age' ? { evolve: 0 } : {}) }))
  const paramsRef = useRef(p)
  paramsRef.current = p
  const ageRef = useRef(p.age)
  const stateRef = useRef({ L: 1, T: SUN_T, R: 1, f: 0, mass: 1, phase: 'Main sequence' })
  const [live, setLive] = useState(stateRef.current)
  const reportRef = useRef(0)
  const { canvasRef, ctxRef } = useCurveCanvas()
  const offRef = useRef(null)
  const keyRef = useRef('')

  const onTick = (st) => {
    if (!offRef.current) offRef.current = document.createElement('canvas')
    drawHR(ctxRef.current, offRef.current, keyRef, paramsRef.current, st)
    const now = performance.now()
    if (now - reportRef.current > 110) {
      reportRef.current = now
      setLive(st)
    }
  }

  const fmtR = (R) => (R < 0.1 ? R.toExponential(1) : R.toFixed(R < 10 ? 2 : 0))
  const life = lifetimeOf(p.mass)
  const readouts = [
    { label: 'Phase', value: live.phase },
    { label: 'Luminosity', value: `${live.L < 0.01 ? live.L.toExponential(1) : live.L.toFixed(live.L < 10 ? 2 : 0)} L☉` },
    { label: 'Temperature', value: `${Math.round(live.T).toLocaleString()} K` },
    { label: 'Spectral class', value: spectralClass(live.T) },
    { label: 'Radius', value: `${fmtR(live.R)} R☉` },
    { label: 'Main-sequence life', value: `${life < 0.01 ? life.toExponential(1) : life.toFixed(2)} Gyr` },
    { label: 'Ends as', value: p.mass < 8 ? 'white dwarf' : 'supernova' },
  ]
  const [sr, sg, sb] = blackbodyColor(live.T)

  return (
    <div className="sim2">
      <SimSwitcher current="hrDiagram" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="The HR diagram" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 0.5, 8.6], fov: 42, near: 0.02, far: 300 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.8]}
      >
        <color attach="background" args={['#03050b']} />
        <StarsBackdrop />
        <Clock paramsRef={paramsRef} ageRef={ageRef} stateRef={stateRef} onTick={onTick} />
        <EvolvingStar stateRef={stateRef} />
        <MainCamera x={-95} y={20} narrowY={0.33} narrowZoom={1.7} />
        <OrbitControls
          makeDefault enableDamping dampingFactor={0.08} enablePan={false}
          minDistance={3} maxDistance={20} rotateSpeed={0.55}
        />
      </Canvas>
      <CurveCard canvasRef={canvasRef} className="ss-curve-hr" title="Hertzsprung-Russell diagram" note="surface temperature, hotter to the left" />
      <div className="sim2-hud">
        <div className="sim2-hud-item">
          <span className="sim2-swatch" style={{ background: `rgb(${sr},${sg},${sb})` }} />
          <span className="sim2-hud-label">phase</span><span className="sim2-hud-value">{live.phase}</span>
        </div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">T</span><span className="sim2-hud-value">{Math.round(live.T).toLocaleString()} K</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">R</span><span className="sim2-hud-value">{fmtR(live.R)} R☉</span></div>
      </div>
    </div>
  )
}
