import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Edges, Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import { CurveCard, MainCamera, Glow, StarBody, StarsBackdrop } from '../shared/StellarScene'
import { useCurveCanvas } from '../shared/lightCurve'
import '../shared/simBase.css'
import {
  planck, rayleighJeans, wienApprox, peakWavelength, totalFlux,
  LINES, wavelengthRGB, blackbodyColor, lineStrength,
} from './planck'

const ACCENT = '#fb7185'
const NM = 1e-9
const LAM_MIN = 40 * NM, LAM_MAX = 2600 * NM

const EMITTER = new THREE.Vector3(-4.3, 0.75, 0)
const ENTRY = new THREE.Vector3(-0.42, 0.12, 0)   // where the beam meets the prism
const EXIT = new THREE.Vector3(0.38, -0.2, 0)     // where the fan leaves it
const SCREEN_X = 4.5
const SCREEN_LO = -2.35, SCREEN_HI = 0.35         // 380 nm at the bottom, 750 at the top

const INTRO = [
  { title: 'What am I looking at?', body: 'A glowing body at the temperature you choose, its light split by a prism onto a screen, and the full Planck curve in the card. The screen shows only the visible slice; the curve shows everything from far ultraviolet to infrared.' },
  { title: 'Why does the colour change?', body: 'The peak slides to shorter wavelengths as things get hotter, which is Wien’s law. The sphere is drawn in the colour your eye would actually see, computed from the spectrum, so the Sun comes out white even though its peak is green.' },
  { title: 'What are the dark gaps?', body: 'Absorption lines: atoms in a star’s cooler outer layers removing light at their own wavelengths. Watch them change as the temperature sweeps. Hydrogen is strongest in white A stars, sodium only survives in cool ones.' },
  { title: 'What can I change?', body: 'Temperature reshapes the curve and moves the peak. Turn off the auto sweep to hold one value. The dashed curves are the classical approximations that fail at either end.' },
]

const PHYSICS = [
  { title: 'Planck’s law', body: 'The exact spectrum of a blackbody. Deriving it required assuming light comes in quanta, which is where quantum mechanics began. The screen is lit by this function evaluated per pixel.', eq: String.raw`B_{\lambda}(T)=\frac{2hc^{2}}{\lambda^{5}}\frac{1}{e^{hc/\lambda k_{B}T}-1}` },
  { title: 'Wien’s displacement law', body: 'Differentiating Planck’s law and setting it to zero gives the peak. It moves inversely with temperature, which is why colour is a thermometer.', eq: String.raw`\lambda_{\max}T=2.898\times10^{-3}\,\text{m\,K}` },
  { title: 'Stefan-Boltzmann law', body: 'Integrating the curve over all wavelengths gives the total power per unit area. The fourth power is steep: twice as hot radiates sixteen times as much.', eq: String.raw`F=\sigma T^{4},\qquad \sigma=5.67\times10^{-8}\,\mathrm{W\,m^{-2}\,K^{-4}}` },
  { title: 'The colour you see', body: 'The spectrum weighted by the eye’s three colour responses, converted to screen primaries. This, not the peak wavelength, is why stars are red, white or blue and never green.', eq: String.raw`X=\int B_{\lambda}(T)\,\bar{x}(\lambda)\,d\lambda,\;\;Y=\int B_{\lambda}\bar{y}\,d\lambda,\;\;Z=\int B_{\lambda}\bar{z}\,d\lambda` },
  { title: 'Why lines come and go', body: 'A line needs atoms in the right state. Too cool and hydrogen sits in its ground state; too hot and it is ionised. The Saha and Boltzmann equations set those populations, which is the physics behind O B A F G K M.', eq: String.raw`\frac{n_{i+1}}{n_{i}}\propto\frac{T^{3/2}}{n_{e}}\,e^{-\chi_{i}/k_{B}T}` },
  { title: 'The ultraviolet catastrophe', body: 'Classical physics predicts energy rising without limit at short wavelengths. Planck’s quantisation cuts it off exponentially, and the dashed red curve shows how badly the classical answer fails.', eq: String.raw`B^{\text{RJ}}_{\lambda}=\frac{2ck_{B}T}{\lambda^{4}}\;\xrightarrow{\lambda\to0}\;\infty` },
]

const CONTROLS = [
  { key: 'T', label: 'Temperature', min: 1500, max: 30000, step: 50, unit: ' K' },
  { key: 'lines', label: 'Absorption lines', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
  { key: 'limits', label: 'Classical limits', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
  { key: 'sweep', label: 'Auto sweep', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'running' : 'paused') },
]

// GLSL shared by the fan and the screen: Planck radiance in the visible band,
// coloured by wavelength, with absorption lines cut in at their lab positions.
const SPECTRUM_GLSL = /* glsl */ `
  uniform float uT;
  uniform float uNorm;
  uniform float uGain;
  uniform float uLinesOn;
  uniform float uLineNm[7];
  uniform float uLineStr[7];

  vec3 lambdaRGB(float nm) {
    vec3 c = vec3(0.0);
    if (nm < 440.0) c = vec3(-(nm - 440.0) / 60.0, 0.0, 1.0);
    else if (nm < 490.0) c = vec3(0.0, (nm - 440.0) / 50.0, 1.0);
    else if (nm < 510.0) c = vec3(0.0, 1.0, -(nm - 510.0) / 20.0);
    else if (nm < 580.0) c = vec3((nm - 510.0) / 70.0, 1.0, 0.0);
    else if (nm < 645.0) c = vec3(1.0, -(nm - 645.0) / 65.0, 0.0);
    else c = vec3(1.0, 0.0, 0.0);
    float f = 1.0;
    if (nm > 700.0) f = 0.3 + 0.7 * (780.0 - nm) / 80.0;
    else if (nm < 420.0) f = 0.3 + 0.7 * (nm - 380.0) / 40.0;
    return c * f;
  }

  // Relative spectral radiance, normalised to the brightest visible wavelength.
  float radiance(float nm) {
    float b = pow(nm / 500.0, -5.0) / (exp(1.4387769e7 / (nm * uT)) - 1.0);
    return b / uNorm;
  }

  vec3 spectrum(float nm) {
    float I = radiance(nm);
    for (int i = 0; i < 7; i++) {
      float d = (nm - uLineNm[i]) / 1.7;
      I *= 1.0 - uLinesOn * uLineStr[i] * 0.92 * exp(-0.5 * d * d);
    }
    return lambdaRGB(nm) * I * uGain;
  }
`

const radianceRel = (nm, T) => Math.pow(nm / 500, -5) / Math.expm1(1.4387769e7 / (nm * T))
function visibleNorm(T) {
  let m = 0
  for (let nm = 380; nm <= 750; nm += 5) m = Math.max(m, radianceRel(nm, T))
  return m
}
const SUN_VIS = visibleNorm(5772)

function makeSpectrumUniforms() {
  return {
    uT: { value: 5772 },
    uNorm: { value: 1 },
    uGain: { value: 1 },
    uLinesOn: { value: 1 },
    uLineNm: { value: LINES.map((l) => l.nm) },
    uLineStr: { value: LINES.map(() => 0) },
  }
}

function updateSpectrumUniforms(u, T, linesOn) {
  const norm = visibleNorm(T)
  u.uT.value = T
  u.uNorm.value = norm
  // The prism light is normalised for shape, then dimmed or brightened gently
  // with how much visible light the body gives off. The full range would be a
  // factor of millions, which no screen can show.
  u.uGain.value = THREE.MathUtils.clamp(Math.pow(norm / SUN_VIS, 0.12), 0.45, 1.3)
  u.uLinesOn.value = linesOn
  for (let i = 0; i < LINES.length; i++) u.uLineStr.value[i] = lineStrength(LINES[i].label, T)
}

// A fan of rays from the prism exit to the screen, one column per wavelength.
function useFanGeometry() {
  return useMemo(() => {
    const N = 96
    const pos = [], lam = [], along = []
    for (let i = 0; i <= N; i++) {
      const f = i / N
      const nm = 380 + f * 370
      const y = SCREEN_LO + f * (SCREEN_HI - SCREEN_LO)
      pos.push(EXIT.x, EXIT.y + (f - 0.5) * 0.06, 0, SCREEN_X, y, 0)
      lam.push(nm, nm)
      along.push(0, 1)
    }
    const idx = []
    for (let i = 0; i < N; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3
      idx.push(a, b, d, a, d, c)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aLam', new THREE.Float32BufferAttribute(lam, 1))
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1))
    g.setIndex(idx)
    return g
  }, [])
}

function Optics({ tRef, paramsRef }) {
  const starRef = useRef(null)
  const glowRef = useRef(null)
  const beamRef = useRef(null)
  const innerRef = useRef(null)
  const fanGeo = useFanGeometry()

  const fanMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: makeSpectrumUniforms(),
    vertexShader: /* glsl */ `
      attribute float aLam;
      attribute float aAlong;
      varying float vLam;
      varying float vAlong;
      void main() {
        vLam = aLam;
        vAlong = aAlong;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: SPECTRUM_GLSL + /* glsl */ `
      varying float vLam;
      varying float vAlong;
      void main() {
        vec3 c = spectrum(vLam);
        float a = 0.22 + 0.5 * vAlong;
        gl_FragColor = vec4(c * a, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [])

  const screenMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: makeSpectrumUniforms(),
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: SPECTRUM_GLSL + /* glsl */ `
      varying vec2 vUv;
      void main() {
        float nm = 380.0 + vUv.y * 370.0;
        vec3 c = spectrum(nm) * 1.25;
        // Soft falloff at the sides, like a slit image on a card.
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        gl_FragColor = vec4(c * edge + vec3(0.035) * (1.0 - edge * 0.6), 1.0);
      }
    `,
  }), [])
  useEffect(() => () => { fanGeo.dispose(); fanMat.dispose(); screenMat.dispose() }, [fanGeo, fanMat, screenMat])

  const beam = useMemo(() => {
    const len = EMITTER.distanceTo(ENTRY)
    const mid = EMITTER.clone().lerp(ENTRY, 0.5)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ENTRY.clone().sub(EMITTER).normalize())
    const inLen = ENTRY.distanceTo(EXIT)
    const inMid = ENTRY.clone().lerp(EXIT, 0.5)
    const inQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), EXIT.clone().sub(ENTRY).normalize())
    return { len, mid, q, inLen, inMid, inQ }
  }, [])

  const rgb = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    const T = tRef.current
    const q = paramsRef.current
    const [r, g, b] = blackbodyColor(T)
    rgb.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
    if (starRef.current) starRef.current.material.uniforms.uColor.value.setRGB(r / 255, g / 255, b / 255)
    // Glow size follows total output, compressed: sigma T^4 spans a factor of
    // 160,000 over the slider range.
    const s = 3.2 + 1.9 * Math.log10(totalFlux(T) / totalFlux(1500))
    glowRef.current?.scale.set(s, s, 1)
    glowRef.current?.material.color.copy(rgb)
    beamRef.current?.material.color.copy(rgb)
    innerRef.current?.material.color.copy(rgb)
    updateSpectrumUniforms(fanMat.uniforms, T, q.lines > 0.5 ? 1 : 0)
    updateSpectrumUniforms(screenMat.uniforms, T, q.lines > 0.5 ? 1 : 0)
  })

  const screenH = SCREEN_HI - SCREEN_LO
  return (
    <>
      <group position={EMITTER}>
        <StarBody starRef={starRef} radius={0.95} u1={0.35} u2={0.1} />
        <Glow spriteRef={glowRef} size={5} opacity={0.5} />
      </group>
      <mesh ref={beamRef} position={beam.mid} quaternion={beam.q}>
        <cylinderGeometry args={[0.05, 0.05, beam.len, 12, 1, true]} />
        <meshBasicMaterial transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={innerRef} position={beam.inMid} quaternion={beam.inQ}>
        <cylinderGeometry args={[0.04, 0.04, beam.inLen, 10, 1, true]} />
        <meshBasicMaterial transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* The prism: a triangular bar of glass seen end on. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <cylinderGeometry args={[1.05, 1.05, 1.5, 3, 1]} />
        <meshStandardMaterial color="#cfe3ff" transparent opacity={0.13} roughness={0.08} metalness={0.1} depthWrite={false} side={THREE.DoubleSide} />
        <Edges threshold={20} color="#dbe8ff" />
      </mesh>

      <mesh geometry={fanGeo} material={fanMat} renderOrder={4} />

      <group position={[SCREEN_X + 0.02, (SCREEN_LO + SCREEN_HI) / 2, 0]} rotation={[0, -0.62, 0]}>
        <mesh material={screenMat}>
          <planeGeometry args={[0.95, screenH, 1, 1]} />
        </mesh>
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[1.08, screenH + 0.14, 0.04]} />
          <meshStandardMaterial color="#1a2030" roughness={0.9} />
        </mesh>
        <Html position={[0, screenH / 2 + 0.32, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="ss-tag">750 nm</span>
        </Html>
        <Html position={[0, -screenH / 2 - 0.32, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="ss-tag">380 nm</span>
        </Html>
      </group>
      <ambientLight intensity={0.25} />
      <pointLight position={EMITTER} intensity={3} decay={0} />
    </>
  )
}

function Sweep({ tRef, dirRef, paramsRef, onTick }) {
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const q = paramsRef.current
    if (q.sweep > 0.5) {
      // Sweep in log temperature so cool and hot ends get equal screen time.
      const lt = Math.log(tRef.current) + dirRef.current * dt * 0.32
      tRef.current = Math.exp(lt)
      if (tRef.current > 26000) { tRef.current = 26000; dirRef.current = -1 }
      if (tRef.current < 2200) { tRef.current = 2200; dirRef.current = 1 }
    } else {
      tRef.current = q.T
    }
    onTick(tRef.current)
  }, -1)
  return null
}

function drawPlanck(c, T, q) {
  if (!c) return
  const { ctx, W, H } = c
  const padL = 12, padR = 12, padT = 8, padB = 22
  const pw = W - padL - padR, ph = H - padT - padB
  ctx.clearRect(0, 0, W, H)
  const X = (lam) => padL + ((Math.log10(lam) - Math.log10(LAM_MIN)) / (Math.log10(LAM_MAX) - Math.log10(LAM_MIN))) * pw
  // Scaled to the current peak so the shape stays readable at any temperature.
  const peakVal = planck(peakWavelength(T), T)
  const Y = (v) => padT + ph - (Math.min(v, peakVal * 1.15) / (peakVal * 1.15)) * ph

  for (let nm = 380; nm <= 750; nm += 3) {
    const [r, g, b] = wavelengthRGB(nm)
    ctx.fillStyle = `rgba(${r},${g},${b},0.2)`
    ctx.fillRect(X(nm * NM), padT, Math.max(1, X((nm + 3) * NM) - X(nm * NM)) + 0.6, ph)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.fillStyle = 'rgba(230,239,255,0.5)'
  ctx.font = '10.5px ui-sans-serif, system-ui, sans-serif'
  ctx.lineWidth = 1
  for (const nm of [50, 100, 200, 400, 700, 1200, 2500]) {
    const x = X(nm * NM)
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); ctx.stroke()
    const label = nm >= 1000 ? `${(nm / 1000).toFixed(1)} µm` : `${nm} nm`
    const w = ctx.measureText(label).width
    ctx.fillText(label, Math.min(W - padR - w, Math.max(padL, x - w / 2)), H - 6)
  }

  const trace = (fn) => {
    ctx.beginPath()
    for (let i = 0; i <= 300; i++) {
      const lam = LAM_MIN * Math.pow(LAM_MAX / LAM_MIN, i / 300)
      const y = Y(fn(lam, T))
      if (i === 0) ctx.moveTo(X(lam), y); else ctx.lineTo(X(lam), y)
    }
    ctx.stroke()
  }
  if (q.limits > 0.5) {
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(248,113,113,0.75)'; trace(rayleighJeans)
    ctx.strokeStyle = 'rgba(96,165,250,0.75)'; trace(wienApprox)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(248,113,113,0.9)'
    ctx.fillText('Rayleigh-Jeans', W - padR - 118, padT + 12)
    ctx.fillStyle = 'rgba(96,165,250,0.9)'
    ctx.fillText('Wien approximation', W - padR - 118, padT + 26)
  }

  ctx.beginPath()
  ctx.moveTo(X(LAM_MIN), padT + ph)
  for (let i = 0; i <= 360; i++) {
    const lam = LAM_MIN * Math.pow(LAM_MAX / LAM_MIN, i / 360)
    ctx.lineTo(X(lam), Y(planck(lam, T)))
  }
  ctx.lineTo(X(LAM_MAX), padT + ph)
  ctx.closePath()
  const [cr, cg, cb] = blackbodyColor(T)
  ctx.fillStyle = `rgba(${cr},${cg},${cb},0.16)`
  ctx.fill()
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
  trace(planck)

  const lp = peakWavelength(T)
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4])
  ctx.beginPath(); ctx.moveTo(X(lp), Y(planck(lp, T))); ctx.lineTo(X(lp), padT + ph); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = ACCENT
  ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif'
  const peakLabel = `peak ${(lp / NM).toFixed(0)} nm`
  const plw = ctx.measureText(peakLabel).width
  ctx.fillText(peakLabel, Math.min(W - padR - plw, X(lp) + 6), Math.max(padT + 12, Y(planck(lp, T)) - 6))

  if (q.lines > 0.5) {
    for (const L of LINES) {
      const x = X(L.nm * NM)
      const s = lineStrength(L.label, T)
      ctx.strokeStyle = `rgba(6,8,14,${0.25 + 0.7 * s})`
      ctx.lineWidth = 1 + 1.6 * s
      ctx.beginPath(); ctx.moveTo(x, Y(planck(L.nm * NM, T))); ctx.lineTo(x, padT + ph); ctx.stroke()
    }
  }
}

export default function BlackbodySpectra({ onSwitchSim }) {
  const [p, setP] = useState({ T: 5772, lines: 1, limits: 1, sweep: 1 })
  // Dragging a value that an automatic mode is driving hands control to you.
  const set = (k, v) => setP((q) => ({ ...q, [k]: v, ...(k === 'T' ? { sweep: 0 } : {}) }))
  const paramsRef = useRef(p)
  paramsRef.current = p
  const tRef = useRef(p.T)
  const dirRef = useRef(1)
  const { canvasRef, ctxRef } = useCurveCanvas()
  const [live, setLive] = useState({ T: p.T })
  const reportRef = useRef(0)

  const onTick = (T) => {
    drawPlanck(ctxRef.current, T, paramsRef.current)
    const now = performance.now()
    if (now - reportRef.current > 110) {
      reportRef.current = now
      setLive({ T })
    }
  }

  const T = live.T
  const peak = peakWavelength(T)
  const cls = T > 30000 ? 'O' : T > 10000 ? 'B' : T > 7500 ? 'A' : T > 6000 ? 'F' : T > 5200 ? 'G' : T > 3700 ? 'K' : 'M'
  const strongest = LINES.reduce((a, l) => (lineStrength(l.label, T) > lineStrength(a.label, T) ? l : a), LINES[0])
  const [sr, sg, sb] = blackbodyColor(T)
  const readouts = [
    { label: 'Temperature', value: `${Math.round(T).toLocaleString()} K` },
    { label: 'Peak wavelength', value: `${(peak / NM).toFixed(0)} nm` },
    { label: 'Peak lies in', value: peak / NM < 380 ? 'ultraviolet' : peak / NM > 750 ? 'infrared' : 'visible' },
    { label: 'Perceived colour', value: `rgb(${sr}, ${sg}, ${sb})` },
    { label: 'Total flux σT⁴', value: `${totalFlux(T).toExponential(2)} W/m²` },
    { label: 'vs the Sun', value: `${(totalFlux(T) / totalFlux(5772)).toFixed(2)}× per m²` },
    { label: 'Spectral class', value: cls },
    { label: 'Strongest line', value: strongest.label },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="blackbodySpectra" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Blackbody and spectra" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [1.2, 1.6, 11.5], fov: 45, near: 0.05, far: 300 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.8]}
      >
        <color attach="background" args={['#03050b']} />
        <StarsBackdrop />
        <Sweep tRef={tRef} dirRef={dirRef} paramsRef={paramsRef} onTick={onTick} />
        <Optics tRef={tRef} paramsRef={paramsRef} />
        <MainCamera x={210} y={140} narrowY={0.3} narrowZoom={2.3} />
        <OrbitControls
          makeDefault enableDamping dampingFactor={0.08} enablePan={false}
          minDistance={5} maxDistance={30} rotateSpeed={0.55}
        />
      </Canvas>
      <CurveCard canvasRef={canvasRef} className="ss-curve-tall" title="Planck spectrum" note="spectral radiance against log wavelength" />
      <div className="sim2-hud">
        <div className="sim2-hud-item">
          <span className="sim2-swatch" style={{ background: `rgb(${sr},${sg},${sb})` }} />
          <span className="sim2-hud-label">T</span><span className="sim2-hud-value">{Math.round(T).toLocaleString()} K</span>
        </div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">peak</span><span className="sim2-hud-value">{(peak / NM).toFixed(0)} nm</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">class</span><span className="sim2-hud-value">{cls}</span></div>
      </div>
    </div>
  )
}
