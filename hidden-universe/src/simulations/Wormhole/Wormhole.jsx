import { useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MathJaxContext, MathJax } from 'better-react-mathjax'
import * as THREE from 'three'
import './Wormhole.css'
import SimHomeButton from '../../site/SimHomeButton'

// MathJax v3 config — load once for the side panel
const MATHJAX_CONFIG = {
  loader: { load: ['[tex]/ams', '[tex]/boldsymbol'] },
  tex: {
    packages: { '[+]': ['ams', 'boldsymbol'] },
    inlineMath:  [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
  },
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ─── Ellis / Morris–Thorne wormhole — per-pixel geodesic ray-march ────────────
// Metric:  ds² = −c²dt² + dl² + (b² + l²)(dθ² + dφ²)
// l is the proper radial coordinate; the throat sits at l = 0 with radius b, and
// l < 0 is a SECOND universe.  For each pixel we integrate the null geodesic in
// the plane it defines, then sample whichever sky the ray escapes into — so a ray
// aimed through the throat shows the other universe, lensed into concentric rings.
const LENS_VERT = /* glsl */`
  varying vec2 vNdc;
  void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const LENS_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vNdc;

  uniform vec3  uF, uR, uU;     // camera basis (world)
  uniform vec3  uURad;          // outward radial unit (direction of increasing l)
  uniform float uTanHalf, uAspect;
  uniform float uCamL;          // signed radial coordinate of the camera
  uniform float uThroat;        // throat radius b
  uniform float uTime;
  uniform float uSteps;         // integration steps (quality)
  uniform float uStarDensity;

  const int STEPMAX = 400;

  float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float hash31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }

  float vnoise(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i+vec3(0,0,0)), n100 = hash31(i+vec3(1,0,0));
    float n010 = hash31(i+vec3(0,1,0)), n110 = hash31(i+vec3(1,1,0));
    float n001 = hash31(i+vec3(0,0,1)), n101 = hash31(i+vec3(1,0,1));
    float n011 = hash31(i+vec3(0,1,1)), n111 = hash31(i+vec3(1,1,1));
    return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y),
               mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.04; a*=0.5; } return s; }

  // Procedural stars sampled by viewing direction (lat-long cells).
  vec3 starField(vec3 d, float seed, vec3 tint){
    float lon = atan(d.z, d.x);
    float lat = asin(clamp(d.y, -1.0, 1.0));
    vec2 uv = vec2(lon * 0.159154 + 0.5, lat * 0.318309 + 0.5);
    vec3 col = vec3(0.0);
    for(int k=0;k<2;k++){
      float sc = uStarDensity * (k==0 ? 1.0 : 2.15);
      vec2 g = uv * sc;
      vec2 cell = floor(g), f = fract(g);
      float present = step(0.88, hash21(cell + seed));
      vec2  ctr = vec2(hash21(cell+seed+5.1), hash21(cell+seed+9.7));
      float dist = length(f - ctr);
      float star = present * smoothstep(0.09, 0.0, dist);
      float tw = 0.7 + 0.3 * sin(uTime * 2.0 + hash21(cell) * 40.0);
      col += star * tw;
    }
    return col * tint;
  }

  // Faint nebula — lensing curves it into the coloured arcs seen around the throat.
  vec3 nebula(vec3 d, vec3 ca, vec3 cb){
    float n1 = fbm(d * 2.4 + 11.0);
    float n2 = fbm(d * 5.3 - 4.0);
    float v  = pow(clamp(n1 * 0.7 + n2 * 0.35, 0.0, 1.0), 2.4);
    return mix(ca, cb, n2) * v;
  }

  vec3 skyNear(vec3 d){                                   // our universe (cool)
    return starField(d, 1.0, vec3(0.85, 0.92, 1.0))
         + nebula(d, vec3(0.10,0.05,0.22), vec3(0.04,0.12,0.20)) * 0.9;
  }
  vec3 skyFar(vec3 d){                                    // the other side (warm)
    return starField(d, 23.0, vec3(1.0, 0.86, 0.62))
         + nebula(d, vec3(0.20,0.09,0.05), vec3(0.05,0.14,0.08)) * 0.9;
  }

  void main(){
    vec3 d = normalize(uF
      + vNdc.x * uTanHalf * uAspect * uR
      + vNdc.y * uTanHalf * uU);

    float a  = uThroat;
    float l  = uCamL;
    float pl = dot(d, uURad);                 // radial momentum (E = 1)
    vec3  tang = d - pl * uURad;
    float tl = length(tang);
    vec3  that = tl > 1e-4 ? tang / tl
                          : normalize(cross(uURad, vec3(0.0, 1.0, 0.0)) + 1e-3);
    float r0 = sqrt(a * a + l * l);
    float L  = r0 * tl;                        // conserved angular momentum
    float L2 = L * L;
    float phi = 0.0;

    float Lmax = max(50.0, abs(uCamL) + 16.0);
    bool  escaped = false;

    for(int i=0;i<STEPMAX;i++){
      if(float(i) >= uSteps) break;
      float r2 = a*a + l*l;
      float h  = clamp(0.12 * sqrt(r2), 0.02, 1.5);     // fine near throat
      float acc = L2 * l / (r2 * r2);                    // d²l/dλ² = L² l / r⁴
      float lN  = l + pl * h + 0.5 * acc * h * h;
      float r2N = a*a + lN*lN;
      float accN = L2 * lN / (r2N * r2N);
      float plN = pl + 0.5 * (acc + accN) * h;
      phi += 0.5 * (L / r2 + L / r2N) * h;               // dφ/dλ = L / r²
      l = lN; pl = plN;
      if(abs(l) > Lmax){ escaped = true; break; }
      if(phi > 22.0) break;
    }

    vec3 col;
    if(!escaped){
      col = vec3(0.0);                                   // captured on the throat orbit → dark ring
    } else {
      vec3 D = sign(pl) * (cos(phi) * uURad + sin(phi) * that);
      // Frame-drag-like rotational swirl: the closer you get to the throat,
      // the faster the lensed sky behind it appears to swim around the axis.
      float swirl = uTime * 0.30 * exp(-abs(uCamL) / 10.0);
      float cS = cos(swirl), sS = sin(swirl);
      vec3 Dr = D * cS + cross(uURad, D) * sS + uURad * dot(uURad, D) * (1.0 - cS);
      col = (l > 0.0) ? skyNear(Dr) : skyFar(Dr);
    }

    // Warped photon ring at the critical impact parameter: ripples around its
    // circumference, brightens and broadens as the camera approaches the throat.
    float ang   = atan(that.y, that.x);
    float warp  = 0.025 * (sin(ang * 6.0 + uTime * 1.7) + 0.6 * sin(ang * 13.0 - uTime * 1.1));
    float close = 1.0 / (1.0 + 0.20 * abs(uCamL));
    float dL    = (L - a) + warp * close;
    float ringW = 0.05 + 0.05 * close;
    float ring  = smoothstep(ringW, 0.0, abs(dL));
    vec3  ringCol = mix(vec3(0.55, 0.80, 1.0), vec3(0.85, 0.55, 1.0),
                        0.5 + 0.5 * sin(ang * 3.0 + uTime * 0.6));
    col += ringCol * ring * (0.9 + 0.6 * close);

    col = vec3(1.0) - exp(-col * 1.5);                   // tonemap
    gl_FragColor = vec4(col, 1.0);
  }
`

// ─── The lens + the WASD / drag free-fly camera ───────────────────────────────
function WormholeLens({ throat, speed, starDensity, fov, quality, resetKey, posRef }) {
  const { gl, size } = useThree()
  const state = useRef({ l: 13, yaw: 0, pitch: 0 })
  const keys  = useRef({})
  const URAD  = useMemo(() => new THREE.Vector3(0, 0, 1), [])   // increasing-l direction

  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0,  3, -1, 0,  -1, 3, 0]), 3))
    const m = new THREE.ShaderMaterial({
      vertexShader: LENS_VERT, fragmentShader: LENS_FRAG,
      uniforms: {
        uF: { value: new THREE.Vector3(0, 0, -1) },
        uR: { value: new THREE.Vector3(1, 0, 0) },
        uU: { value: new THREE.Vector3(0, 1, 0) },
        uURad: { value: new THREE.Vector3(0, 0, 1) },
        uTanHalf: { value: 0.6 }, uAspect: { value: 1 },
        uCamL: { value: 13 }, uThroat: { value: 1 },
        uTime: { value: 0 }, uSteps: { value: 200 }, uStarDensity: { value: 90 },
      },
      depthTest: false, depthWrite: false,
    })
    return { geo: g, mat: m }
  }, [])

  // Reset position when the button is pressed
  useEffect(() => { state.current = { l: 13, yaw: 0, pitch: 0 } }, [resetKey])

  // Keyboard.  Skip when a form control has focus so range-slider arrow keys
  // and the like still work normally.
  useEffect(() => {
    const move = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])
    const inForm = () => {
      const t = document.activeElement
      return !!t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
    }
    const kd = (e) => {
      if (inForm()) return
      keys.current[e.code] = true
      if (move.has(e.code)) e.preventDefault()
    }
    const ku = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  // Mouse-drag look
  useEffect(() => {
    const el = gl.domElement
    let dragging = false, lx = 0, ly = 0
    const down = (e) => { dragging = true; lx = e.clientX; ly = e.clientY }
    const movem = (e) => {
      if (!dragging) return
      const s = state.current
      s.yaw   += (e.clientX - lx) * 0.005
      s.pitch  = clamp(s.pitch - (e.clientY - ly) * 0.005, -1.45, 1.45)
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { dragging = false }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', movem)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', movem)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])

  useFrame((_, dt) => {
    const s = state.current
    const k = keys.current
    const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch)
    const cy = Math.cos(s.yaw),   sy = Math.sin(s.yaw)
    const F = new THREE.Vector3(sy * cp, sp, -cy * cp)
    const R = new THREE.Vector3().crossVectors(F, new THREE.Vector3(0, 1, 0)).normalize()
    const U = new THREE.Vector3().crossVectors(R, F).normalize()

    const boost = (k['ShiftLeft'] || k['ShiftRight']) ? 2.6 : 1
    const step  = speed * boost * dt
    let fwd = 0, turn = 0
    if (k['KeyW'] || k['ArrowUp'])    fwd  += 1
    if (k['KeyS'] || k['ArrowDown'])  fwd  -= 1
    if (k['KeyA'] || k['ArrowLeft'])  turn -= 1
    if (k['KeyD'] || k['ArrowRight']) turn += 1
    // Forward motion changes l by the radial component of the view direction.
    s.l   = clamp(s.l + F.dot(URAD) * fwd * step, -45, 45)
    s.yaw += turn * dt * 1.3
    if (posRef && posRef.current) posRef.current.l = s.l

    const U_ = mat.uniforms
    U_.uF.value.copy(F); U_.uR.value.copy(R); U_.uU.value.copy(U)
    U_.uCamL.value   = s.l
    U_.uThroat.value = throat
    U_.uTanHalf.value = Math.tan((fov * Math.PI / 180) / 2)
    U_.uAspect.value  = size.width / size.height
    U_.uStarDensity.value = starDensity
    U_.uSteps.value  = quality
    U_.uTime.value  += dt
  })

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-1} />
}

// ─── Embedding diagram (Flamm-style funnel) — bottom-left inset ────────────────
function makeFunnel() {
  const a = 0.55, hScale = 0.62, lMax = 2.7, rings = 15, seg = 44, merid = 18
  const pos = []
  const ringR = (l) => Math.sqrt(a * a + l * l)
  for (let i = 0; i < rings; i++) {
    const l = -lMax + (2 * lMax) * (i / (rings - 1))
    const r = ringR(l), y = l * hScale
    for (let j = 0; j < seg; j++) {
      const t0 = (j / seg) * Math.PI * 2, t1 = ((j + 1) / seg) * Math.PI * 2
      pos.push(r * Math.cos(t0), y, r * Math.sin(t0), r * Math.cos(t1), y, r * Math.sin(t1))
    }
  }
  for (let m = 0; m < merid; m++) {
    const th = (m / merid) * Math.PI * 2
    let prev = null
    for (let i = 0; i < rings; i++) {
      const l = -lMax + (2 * lMax) * (i / (rings - 1))
      const r = ringR(l), y = l * hScale
      const p = [r * Math.cos(th), y, r * Math.sin(th)]
      if (prev) pos.push(prev[0], prev[1], prev[2], p[0], p[1], p[2])
      prev = p
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return g
}

function FunnelWire() {
  const geo = useMemo(() => makeFunnel(), [])
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.3 })
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#7fe6ff" transparent opacity={0.55} />
    </lineSegments>
  )
}

// Tracker bead that slides along the funnel showing the camera's signed l.
// Sits at a fixed meridian (φ=0) so the spinning wireframe carries the eye
// around it — the radial bead position is what tracks your trajectory.
function TrackerMarker({ posRef }) {
  const beadRef = useRef()
  const haloRef = useRef()
  // Funnel mesh constants — keep in sync with makeFunnel().
  const A = 0.55, H_SCALE = 0.62, L_MAX = 2.7
  const L_CAM_MAX = 30  // camera l beyond this clamps to the funnel's edge
  useFrame(() => {
    const p = posRef && posRef.current
    if (!p) return
    const lReal = p.l
    const lE = Math.max(-L_MAX, Math.min(L_MAX, (lReal / L_CAM_MAX) * L_MAX))
    const r  = Math.sqrt(A * A + lE * lE)
    const y  = lE * H_SCALE
    if (beadRef.current) beadRef.current.position.set(r, y, 0)
    if (haloRef.current) {
      haloRef.current.position.set(r, y, 0)
      const pulse = 1 + 0.30 * Math.sin(performance.now() * 0.004)
      haloRef.current.scale.setScalar(pulse)
    }
  })
  return (
    <>
      <mesh ref={beadRef}>
        <sphereGeometry args={[0.085, 18, 18]} />
        <meshBasicMaterial color="#ffb060" />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.18, 18, 18]} />
        <meshBasicMaterial
          color="#ffb060"
          transparent
          opacity={0.30}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  )
}

function EmbeddingDiagram({ posRef }) {
  return (
    <div className="wh-embed" title="Embedding diagram of the wormhole throat">
      <Canvas camera={{ position: [0, 1.5, 4.4], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <group rotation={[0.38, 0, 0]}>
          <FunnelWire />
          <TrackerMarker posRef={posRef} />
        </group>
      </Canvas>
      <span className="wh-embed-label">You are here</span>
    </div>
  )
}

// ─── Simulation type nav ──────────────────────────────────────────────────────
function SimTypeBar({ onSwitchSim }) {
  return (
    <div className="sim-type-bar">
      <SimHomeButton onSwitchSim={onSwitchSim} />
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('darkMatter')}>
        <span className="sim-type-icon">◉</span>Dark Matter
      </button>
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('blackHole')}>
        <span className="sim-type-icon">⬡</span>Kerr Black Hole
      </button>
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('neutronStar')}>
        <span className="sim-type-icon">✦</span>Neutron Star
      </button>
      <button type="button" className="sim-type-tab sim-type-tab-active">
        <span className="sim-type-icon">◯</span>Wormhole
      </button>
    </div>
  )
}

// ─── Controls + physics ───────────────────────────────────────────────────────
const CONTROL_DEFS = [
  { key: 'throat',      label: 'Throat Radius',  min: 0.3, max: 4.0, step: 0.05, unit: '' },
  { key: 'speed',       label: 'Move Speed',     min: 0.5, max: 8.0, step: 0.1,  unit: '×' },
  { key: 'starDensity', label: 'Star Density',   min: 30,  max: 200, step: 5,    unit: '' },
  { key: 'fov',         label: 'Field of View',  min: 45,  max: 100, step: 1,    unit: '°' },
  { key: 'quality',     label: 'Quality',        min: 90,  max: 360, step: 10,   unit: '' },
]

const INTRO_CARDS = [
  {
    title: 'What is a wormhole?',
    body: 'A hypothetical tunnel through spacetime that connects two distant regions — or two entirely separate universes — through a narrow "throat". This is an Ellis/Morris–Thorne wormhole, the simplest traversable kind.',
  },
  {
    title: 'What am I seeing?',
    body: 'You are looking into the throat. The image inside the rings is the sky of the OTHER universe (warmer stars), gravitationally lensed into concentric arcs. The cooler stars around the outside are your own universe, also bent by the wormhole.',
  },
  {
    title: 'How do I move?',
    body: 'Drag to look around. W / S fly forward and back, A / D turn, and Shift boosts speed. Fly straight into the throat to pass through to the other universe — keep going and you can come back.',
  },
  {
    title: 'Is this real?',
    body: 'Wormholes are valid solutions of Einstein’s equations, but holding one open requires "exotic matter" with negative energy density, which has never been observed. No real wormhole has ever been detected.',
  },
]

const PHYSICS_CARDS = [
  {
    title: 'Ellis / Morris–Thorne Metric',
    body: 'The spacetime of a simple traversable wormhole. l is the proper radial distance; it runs from −∞ (one universe) through the throat at l = 0 to +∞ (the other). There is no singularity and no event horizon.',
    eq: String.raw`ds^{2}=-c^{2}dt^{2}+dl^{2}+(b^{2}+l^{2})\,d\Omega^{2}`,
  },
  {
    title: 'The Throat',
    body: 'The circumferential radius is smallest at l = 0, where it equals the throat radius b. Far away it grows linearly, so each side looks like ordinary flat space.',
    eq: String.raw`r(l)=\sqrt{b^{2}+l^{2}},\qquad r_{\min}=b`,
  },
  {
    title: 'Null Geodesics & Lensing',
    body: 'Light follows null geodesics. With conserved angular momentum L the radial coordinate obeys the equation the shader integrates — bending rays so strongly that the far universe wraps into rings.',
    eq: String.raw`\frac{d^{2}l}{d\lambda^{2}}=\frac{L^{2}\,l}{r^{4}},\qquad \frac{d\varphi}{d\lambda}=\frac{L}{r^{2}}`,
  },
  {
    title: 'Photon Ring',
    body: 'Rays whose impact parameter equals the throat radius can orbit the throat on an unstable circular path, piling up into the bright thin ring at the wormhole’s edge.',
    eq: String.raw`b_{\text{crit}}=b\quad\Rightarrow\quad\text{unstable photon orbit at }l=0`,
  },
  {
    title: 'Exotic Matter (NEC violation)',
    body: 'To stay open, a wormhole must thread its throat with matter that violates the null energy condition — effectively negative energy density. This is the central obstacle to a real wormhole.',
    eq: String.raw`T_{\mu\nu}k^{\mu}k^{\nu}<0\quad(\text{null energy condition violated})`,
  },
  {
    title: 'Embedding Diagram',
    body: 'Slicing the geometry at a fixed time and embedding it in flat 3-space gives the funnel shown bottom-left: two sheets joined at the throat — the iconic picture of a wormhole.',
    eq: String.raw`z(r)=\pm\, b\,\cosh^{-1}\!\left(\frac{r}{b}\right)`,
  },
]

function SidePanel({ values, onChange, onReset }) {
  const [open, setOpen] = useState(true)
  const [tab, setTab]   = useState('intro')

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
    <div className={`wh-panel ${open ? '' : 'wh-panel-collapsed'}`}>
      <button type="button" className="wh-panel-toggle"
        onClick={() => setOpen((o) => !o)} title={open ? 'Hide panel' : 'Show panel'}>
        {open ? '✕' : '⚙'}
      </button>
      {open && (
        <>
          <div className="wh-tabs">
            <button type="button"
              className={`wh-tab ${tab === 'intro' ? 'wh-tab-active' : ''}`}
              onClick={() => setTab('intro')}>Intro</button>
            <button type="button"
              className={`wh-tab ${tab === 'controls' ? 'wh-tab-active' : ''}`}
              onClick={() => setTab('controls')}>Controls</button>
            <button type="button"
              className={`wh-tab ${tab === 'physics' ? 'wh-tab-active' : ''}`}
              onClick={() => setTab('physics')}>Physics</button>
          </div>

          <div className="wh-panel-body">
            {tab === 'intro' && (
              <div className="wh-physics">
                <h2 className="wh-panel-title">Welcome</h2>
                {INTRO_CARDS.map((c) => (
                  <article key={c.title} className="wh-phys-card">
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                  </article>
                ))}
              </div>
            )}

            {tab === 'controls' && (
              <>
                <h2 className="wh-panel-title">Wormhole Parameters</h2>
                {CONTROL_DEFS.map(({ key, label, min, max, step, unit }) => (
                  <div key={key} className="wh-slider-row">
                    <div className="wh-slider-head">
                      <span>{label}</span>
                      <span className="wh-slider-val">
                        {values[key].toFixed(step < 1 ? 2 : 0)}{unit}
                      </span>
                    </div>
                    <input type="range" min={min} max={max} step={step}
                      value={values[key]}
                      onChange={(e) => onChange(key, parseFloat(e.target.value))} />
                  </div>
                ))}
                <button type="button" className="wh-reset-btn" onClick={onReset}>
                  Reset position
                </button>
              </>
            )}

            {tab === 'physics' && (
              <div className="wh-physics">
                <h2 className="wh-panel-title">Wormhole Physics</h2>
                {PHYSICS_CARDS.map((c) => (
                  <article key={c.title} className="wh-phys-card">
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                    <div className="wh-phys-eq">
                      <MathJax dynamic>{`\\[${c.eq}\\]`}</MathJax>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </MathJaxContext>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Wormhole({ onSwitchSim }) {
  const [params, setParams] = useState({
    throat: 1.0, speed: 3.0, starDensity: 90, fov: 60, quality: 200,
  })
  const [resetKey, setResetKey] = useState(0)
  const setParam = (key, v) => setParams((p) => ({ ...p, [key]: v }))
  // Shared with the embedding-diagram inset so the tracker bead can show
  // where along the wormhole the camera currently is.
  const posRef = useRef({ l: 13 })

  return (
    <div className="wh-sim">
      <SimTypeBar onSwitchSim={onSwitchSim} />
      <SidePanel values={params} onChange={setParam} onReset={() => setResetKey((k) => k + 1)} />
      <Canvas
        style={{ background: '#000005', width: '100%', height: '100%', touchAction: 'none' }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance',
              stencil: false, depth: false }}
        dpr={[0.7, 1.3]}
        flat
      >
        <WormholeLens
          throat={params.throat}
          speed={params.speed}
          starDensity={params.starDensity}
          fov={params.fov}
          quality={params.quality}
          resetKey={resetKey}
          posRef={posRef}
        />
      </Canvas>
      <EmbeddingDiagram posRef={posRef} />
      <div className="wh-hud">
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move
        <span className="wh-hud-sep">·</span> drag to look
        <span className="wh-hud-sep">·</span> <kbd>⇧</kbd> boost
      </div>
    </div>
  )
}
