import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import '../shared/simBase.css'
import {
  lorentzGamma, dopplerFactor, beaming, headlightAngle, properTime,
  contractedLength, kineticEnergy,
} from './relativity'

const ACCENT = '#60a5fa'

// Every star is transformed on the GPU. Aberration, Doppler and beaming are all
// applied per star from the exact formulae, so the view is a real prediction of
// what a relativistic traveller sees rather than a tint and a blur.
const VERT = /* glsl */`
uniform float uBeta;
uniform float uGamma;
uniform float uTime;
attribute float aSize;
attribute float aTemp;
varying vec3 vColor;
varying float vAlpha;

// Blackbody-ish colour from a temperature parameter in 0..1, shifted by the
// Doppler factor. Multiplying the temperature by D is exactly how a blackbody
// spectrum transforms, which is why this is the honest way to recolour.
vec3 tempColor(float t){
  t = clamp(t, 0.0, 1.0);
  return vec3(
    clamp(1.45 - t * 0.95, 0.0, 1.0),
    clamp(0.55 + 0.55 * sin(3.14159 * t), 0.0, 1.0),
    clamp(0.25 + t * 1.25, 0.0, 1.0));
}

void main(){
  vec3 dir = normalize(position);

  // Travel is along +z. cosTheta is measured from the direction of motion.
  float c = dir.z;

  // Relativistic aberration: cos' = (c + beta) / (1 + beta c).
  float cp = (c + uBeta) / (1.0 + uBeta * c);
  // Rebuild the direction with the same azimuth but the new polar angle.
  float s = sqrt(max(0.0, 1.0 - cp * cp));
  vec2 perp = length(dir.xy) > 1e-6 ? normalize(dir.xy) : vec2(1.0, 0.0);
  vec3 adir = vec3(perp * s, cp);

  // Doppler factor for the ORIGINAL angle, which is the physical one.
  float D = 1.0 / (uGamma * (1.0 - uBeta * c));

  // A blackbody at temperature T seen with Doppler factor D looks like a
  // blackbody at D*T, so shifting the colour parameter is exact, not a fudge.
  // Exaggerate the shift slightly around neutral so the colour change is
  // legible on screen while still moving in the direction the physics says.
  vColor = tempColor(0.5 + (aTemp * D - 0.5) * 1.35);

  // Headlight beaming: intensity goes as D^4. A screen cannot show a range of
  // 40,000 to 1, so brightness is mapped logarithmically, like a magnitude
  // scale: every factor of two in intensity is a fixed step. Stars astern still
  // fade to nothing, stars ahead still blaze.
  float I = pow(D, 4.0);
  vAlpha = clamp(0.3 + 0.085 * log2(I), 0.0, 1.0);

  vec4 mv = modelViewMatrix * vec4(adir * 40.0, 1.0);
  gl_Position = projectionMatrix * mv;
  // Keep them point-like: at 40 units out a 300/z scale made every star a blob.
  gl_PointSize = aSize * (0.95 + 0.3 * clamp(log2(D), -1.0, 3.0)) * (72.0 / -mv.z);
}
`

const FRAG = /* glsl */`
precision highp float;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`

function StarSphere({ betaRef }) {
  const { geometry, material } = useMemo(() => {
    const N = 14000
    const pos = new Float32Array(N * 3)
    const size = new Float32Array(N)
    const temp = new Float32Array(N)
    // Deterministic, so the sky is the same every time you arrive.
    let seed = 0x5eed17
    const rand = () => {
      seed = (seed + 0x6d2b79f5) >>> 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    for (let i = 0; i < N; i++) {
      // Uniform on the sphere: z uniform, azimuth uniform.
      const z = rand() * 2 - 1
      const th = rand() * Math.PI * 2
      const r = Math.sqrt(1 - z * z)
      pos[i * 3] = r * Math.cos(th)
      pos[i * 3 + 1] = r * Math.sin(th)
      pos[i * 3 + 2] = z
      size[i] = 1.3 + rand() * 3.0
      temp[i] = 0.2 + rand() * 0.6
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aTemp', new THREE.BufferAttribute(temp, 1))
    // Built here rather than as <shaderMaterial uniforms={...}>: r3f copies a
    // uniforms prop, so writes to the original object never reach the GPU.
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uBeta: { value: 0 }, uGamma: { value: 1 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry: g, material: m }
  }, [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  useFrame((_, dt) => {
    const beta = betaRef.current
    material.uniforms.uBeta.value = beta
    material.uniforms.uGamma.value = lorentzGamma(beta)
    material.uniforms.uTime.value += dt
  })

  // The transformed positions leave the geometry's bounding sphere, so culling
  // would drop the whole sky when the camera turns.
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

// The headlight cone, drawn so the narrowing is visible rather than implied.
function HeadlightCone({ beta, show }) {
  const ref = useRef(null)
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(t), Math.sin(t), 0))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const ang = headlightAngle(beta)
    const z = 30
    g.position.set(0, 0, z)
    g.scale.setScalar(Math.tan(ang) * z)
  })
  if (!show) return null
  return (
    <line ref={ref} geometry={geo}>
      <lineBasicMaterial color="#60a5fa" transparent opacity={0.45} />
    </line>
  )
}

// Look forward, along the direction of travel.
function Rig() {
  const { camera } = useThree()
  useFrame(() => { camera.lookAt(0, 0, 40) })
  return null
}

const INTRO = [
  { title: 'What am I looking at?', body: 'The sky as it would actually appear if you flew through it at a large fraction of light speed. Every star is transformed by the exact relativistic formulae.' },
  { title: 'Why do the stars pile up ahead?', body: 'Aberration. Your motion changes the angle at which light reaches you, sweeping the whole sky toward the direction you are travelling. At high speed nearly everything ends up in front.' },
  { title: 'Why do the colours change?', body: 'Doppler shift. Light ahead is blueshifted and light behind is reddened. Even a star exactly to your side is redshifted, purely from time dilation, with no classical equivalent.' },
  { title: 'Why does it get so bright ahead?', body: 'Beaming. Intensity scales as the fourth power of the Doppler factor, so at 0.9c the view ahead is about 361 times brighter while the view astern goes nearly dark.' },
]

const PHYSICS = [
  { title: 'Relativistic aberration', body: 'The angle of incoming light depends on your motion. This is what crowds the stars forward, and it follows directly from the Lorentz transformation of the light ray’s direction.', eq: String.raw`\cos\theta'=\frac{\cos\theta+\beta}{1+\beta\cos\theta}` },
  { title: 'Relativistic Doppler', body: 'The classical shift multiplied by time dilation. Set theta to ninety degrees and the classical part vanishes, leaving a pure transverse redshift of 1/gamma.', eq: String.raw`D=\frac{1}{\gamma\left(1-\beta\cos\theta\right)},\qquad \lambda_{\text{obs}}=\frac{\lambda_{0}}{D}` },
  { title: 'The headlight effect', body: 'Specific intensity is not invariant. It transforms as the fourth power of the Doppler factor, which is why relativistic jets in astronomy look so one-sided.', eq: String.raw`I_{\nu}\propto D^{4},\qquad \sin\theta_{1/2}=\frac{1}{\gamma}` },
  { title: 'What it costs', body: 'Kinetic energy diverges as beta approaches one. Getting to 0.99c costs about six times the rest energy of the ship, which is why this remains a thought experiment.', eq: String.raw`E_{k}=(\gamma-1)mc^{2}` },
]

const CONTROLS = [
  { key: 'beta', label: 'Speed β = v/c', min: 0, max: 0.995, step: 0.005, unit: ' c' },
  { key: 'accelerate', label: 'Auto accelerate', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'running' : 'paused') },
  { key: 'cone', label: 'Headlight cone', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
]

export default function RelativisticFlight({ onSwitchSim }) {
  const [p, setP] = useState({ beta: 0.6, accelerate: 1, cone: 1 })
  // Dragging a value that an automatic mode is driving hands control to you.
  const set = (k, v) => setP((q) => ({ ...q, [k]: v, ...(k === 'beta' ? { accelerate: 0 } : {}) }))
  const [betaLive, setBetaLive] = useState(p.beta)
  const betaRef = useRef(p.beta)
  const dirRef = useRef(1)
  const paramsRef = useRef(p)
  paramsRef.current = p
  const reportRef = useRef(0)

  const g = lorentzGamma(betaLive)
  const readouts = [
    { label: 'Speed', value: `${betaLive.toFixed(3)} c` },
    { label: 'Lorentz factor γ', value: g.toFixed(2) },
    { label: 'Doppler ahead', value: `${dopplerFactor(1, betaLive).toFixed(2)}×` },
    { label: 'Doppler astern', value: `${dopplerFactor(-1, betaLive).toFixed(3)}×` },
    { label: 'Transverse shift', value: `${dopplerFactor(0, betaLive).toFixed(3)}× (time dilation only)` },
    { label: 'Beaming ahead', value: `${beaming(1, betaLive).toFixed(0)}×` },
    { label: 'Headlight half-angle', value: `${((headlightAngle(betaLive) * 180) / Math.PI).toFixed(1)}°` },
    { label: '1 year aboard', value: `${(1 / properTime(1, betaLive)).toFixed(2)} yr outside` },
    { label: 'A metre becomes', value: `${contractedLength(1, betaLive).toFixed(3)} m` },
    { label: 'Energy cost', value: `${kineticEnergy(betaLive).toFixed(2)} mc²` },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="relativisticFlight" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Relativistic flight" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 0, 0], fov: 75, near: 0.1, far: 300 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.7]}
      >
        <color attach="background" args={['#01020a']} />
        <Rig />
        <Throttle paramsRef={paramsRef} betaRef={betaRef} dirRef={dirRef} reportRef={reportRef} onBeta={setBetaLive} />
        <StarSphere betaRef={betaRef} />
        <HeadlightCone beta={betaLive} show={p.cone > 0.5} />
      </Canvas>
      <div className="sim2-hud">
        <div className="sim2-hud-item"><span className="sim2-hud-label">β</span><span className="sim2-hud-value">{betaLive.toFixed(3)} c</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">γ</span><span className="sim2-hud-value">{g.toFixed(2)}</span></div>
        <div className="sim2-hud-item"><span className="sim2-hud-label">beaming</span><span className="sim2-hud-value">{beaming(1, betaLive).toFixed(0)}×</span></div>
      </div>
    </div>
  )
}

// Hoisted so it is not remade on every render.
function Throttle({ paramsRef, betaRef, dirRef, reportRef, onBeta }) {
  useFrame((_, dt) => {
    const q = paramsRef.current
    if (q.accelerate > 0.5) {
      betaRef.current += dirRef.current * dt * 0.055
      if (betaRef.current > 0.995) { betaRef.current = 0.995; dirRef.current = -1 }
      if (betaRef.current < 0.02) { betaRef.current = 0.02; dirRef.current = 1 }
    } else {
      betaRef.current = q.beta
    }
    const now = performance.now()
    if (now - reportRef.current > 70) { reportRef.current = now; onBeta(betaRef.current) }
  })
  return null
}
