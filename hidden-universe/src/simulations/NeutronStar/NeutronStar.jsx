import { useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { MathJaxContext, MathJax } from 'better-react-mathjax'
import * as THREE from 'three'
import HandGestureControl, { advanceGesture } from '../DarkMatter/HandGestureControl'
import './NeutronStar.css'
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

// ─── Shared GLSL — value-noise + fbm for plasma & jet turbulence ──────────────
const NOISE = /* glsl */`
  float h31(vec3 p){ p = fract(p * vec3(127.1, 311.7, 74.7)); p += dot(p, p + 45.32); return fract(p.x * p.y * p.z); }
  float vnoise(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h31(i+vec3(0,0,0)), h31(i+vec3(1,0,0)), f.x),
          mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x),
          mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`

// Vertex shared by the star surface and the fresnel halo shell
const SURF_VERT = /* glsl */`
  varying vec3 vN; varying vec3 vP; varying vec3 vView;
  void main(){
    vP = position;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

// Wispy blue-white neutron-star photosphere: domain-warped cloud marbling in
// the centre + an intense glowing limb, à la the reference render.
const STAR_FRAG = /* glsl */`
  precision highp float;
  ${NOISE}
  varying vec3 vN; varying vec3 vP; varying vec3 vView;
  uniform float uTime; uniform float uTemp; uniform vec3 uRim;
  void main(){
    vec3 p = normalize(vP);
    float t = uTime * 0.06;

    // ── Domain-warped fbm → soft wispy cloud marbling across the surface ──
    vec3 q = vec3(
      fbm3(p * 2.2 + vec3(0.0, t, 0.0)),
      fbm3(p * 2.2 + vec3(3.1, 1.2, t)),
      fbm3(p * 2.2 + vec3(1.7, 8.3, -t))
    );
    float clouds = fbm3(p * 3.2 + 3.5 * q + vec3(0.0, t * 0.6, 0.0));
    float detail = fbm3(p * 7.5 + 2.2 * q - vec3(t, 0.0, 0.0));   // fine wisps
    clouds = clamp(clouds * 0.68 + detail * 0.32, 0.0, 1.0);

    // ── Cloud palette: deep-blue troughs → bright white-blue crests ───────
    vec3 deepBlue  = vec3(0.06, 0.22, 0.55);
    vec3 midBlue   = vec3(0.30, 0.58, 0.92);
    vec3 whiteBlue = vec3(0.85, 0.95, 1.00);
    vec3 col = mix(deepBlue, midBlue, smoothstep(0.20, 0.55, clouds));
    col = mix(col, whiteBlue, smoothstep(0.60, 0.92, clouds));    // bright wisps
    col += whiteBlue * pow(clouds, 4.0) * 0.5;                    // hot filament cores

    // ── Temperature tint: cooler → amber, hotter → blue-white ────────────
    vec3 tint = mix(vec3(1.30, 0.82, 0.50), vec3(0.80, 0.92, 1.15), clamp(uTemp, 0.0, 1.0));
    col *= tint;

    // ── Intense limb brightening (bright glowing edge like the image) ─────
    float ndv     = max(dot(normalize(vN), normalize(vView)), 0.0);
    float rim     = pow(1.0 - ndv, 2.0);    // broad bright halo into the disc
    float hotEdge = pow(1.0 - ndv, 5.0);    // sharp white-hot silhouette
    col += uRim * rim * 2.3;
    col += vec3(0.92, 0.97, 1.00) * hotEdge * 2.6;

    col *= 0.94 + 0.06 * sin(uTime * 2.2);                        // gentle pulse
    gl_FragColor = vec4(col, 1.0);
  }
`

// Additive back-side fresnel shell → soft glowing rim, broken into wispy
// filaments by fbm so the halo flickers like the reference render.
const SHELL_FRAG = /* glsl */`
  precision highp float;
  ${NOISE}
  varying vec3 vN; varying vec3 vP; varying vec3 vView;
  uniform vec3 uColor; uniform float uPow; uniform float uStrength; uniform float uTime;
  void main(){
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), uPow);
    vec3 p = normalize(vP);
    float w = fbm3(p * 3.0 + vec3(0.0, uTime * 0.10, 0.0));        // wispy filaments
    f *= 0.50 + 0.95 * w;
    gl_FragColor = vec4(uColor, f * uStrength);
  }
`

// ─── Polar jets — collimated synchrotron beams along the magnetic axis ─────────
const JET_VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vLocal;
  void main(){ vUv = uv; vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const JET_FRAG = /* glsl */`
  precision highp float;
  ${NOISE}
  varying vec2 vUv; varying vec3 vLocal;
  uniform float uTime; uniform float uLum; uniform float uRmax;
  void main(){
    float r = length(vLocal.xz);
    float edge   = clamp(r / uRmax, 0.0, 1.0);
    float radial = pow(1.0 - edge, 1.6);                           // fat soft core
    float along  = clamp(vUv.y, 0.0, 1.0);                         // 0 = base (star)
    float lengthEnv = exp(-along * 1.7) * smoothstep(0.0, 0.05, along);
    float flick = 0.75 + 0.25 * fbm3(vec3(vLocal.xz * 1.5, uTime * 1.2));

    vec3 hot  = vec3(0.85, 0.95, 1.35);
    vec3 cool = vec3(0.35, 0.45, 1.15);
    vec3 col  = mix(cool, hot, radial);
    gl_FragColor = vec4(col, radial * lengthEnv * flick * uLum);
  }
`

// ─── Soft radial sprite used for the bloom halo + ambient nebulosity ──────────
function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0.0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(180,220,255,0.65)')
  g.addColorStop(1.0, 'rgba(120,180,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ─── Dipole field-line geometry  r(θ) = L·sin²θ  about the magnetic (+Y) axis ──
function buildDipole(L, phi, Rstar) {
  const N = 60
  const pts = []
  const th0 = Math.asin(Math.min(Math.sqrt(Rstar / L), 1))  // line meets the surface
  for (let i = 0; i <= N; i++) {
    const th = th0 + (Math.PI - 2 * th0) * (i / N)
    const r  = L * Math.sin(th) * Math.sin(th)
    const x  = r * Math.sin(th)
    const y  = r * Math.cos(th)
    pts.push(new THREE.Vector3(x * Math.cos(phi), y, x * Math.sin(phi)))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  return {
    core: new THREE.TubeGeometry(curve, 90, 0.022, 6, false),
    halo: new THREE.TubeGeometry(curve, 90, 0.070, 6, false),
  }
}

// ─── The glowing star: photosphere + fresnel shell + bloom sprite ─────────────
function StarCore({ temp }) {
  const starMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SURF_VERT, fragmentShader: STAR_FRAG,
    uniforms: {
      uTime: { value: 0 }, uTemp: { value: 0.78 },           // uTemp set live in useFrame
      uRim:  { value: new THREE.Color(0.75, 0.92, 1.00) },
    },
  }), [])

  // Bright wispy fresnel rim hugging the silhouette
  const shellMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SURF_VERT, fragmentShader: SHELL_FRAG,
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.BackSide,
    uniforms: {
      uColor: { value: new THREE.Color(0.55, 0.80, 1.00) },
      uPow: { value: 2.3 }, uStrength: { value: 1.35 }, uTime: { value: 0 },
    },
  }), [])

  // Larger, fainter shell → soft wispy outer glow
  const hazeMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SURF_VERT, fragmentShader: SHELL_FRAG,
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.BackSide,
    uniforms: {
      uColor: { value: new THREE.Color(0.35, 0.62, 1.00) },
      uPow: { value: 1.7 }, uStrength: { value: 0.6 }, uTime: { value: 0 },
    },
  }), [])

  const glowTex = useMemo(() => makeGlowTexture(), [])

  useFrame((_, dt) => {
    starMat.uniforms.uTime.value += dt
    starMat.uniforms.uTemp.value = temp
    shellMat.uniforms.uTime.value += dt
    hazeMat.uniforms.uTime.value += dt * 0.7
  })

  return (
    <group>
      <mesh material={starMat}><sphereGeometry args={[1, 128, 128]} /></mesh>
      <mesh material={shellMat} scale={1.14}><sphereGeometry args={[1, 64, 64]} /></mesh>
      <mesh material={hazeMat} scale={1.55}><sphereGeometry args={[1, 48, 48]} /></mesh>
      <sprite scale={[8.5, 8.5, 1]}>
        <spriteMaterial map={glowTex} color="#8fc8ff" transparent opacity={0.9}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

// ─── Two opposed polar jets along the magnetic axis ───────────────────────────
function Jets({ lum }) {
  const geo = useMemo(() => {
    // radiusTop (far, flared) → radiusBottom (narrow at the pole); base sits at y=0
    const g = new THREE.CylinderGeometry(0.55, 0.10, 8, 28, 1, true)
    g.translate(0, 4, 0)
    return g
  }, [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: JET_VERT, fragmentShader: JET_FRAG,
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uLum: { value: 1 }, uRmax: { value: 0.6 } },
  }), [])

  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt; mat.uniforms.uLum.value = lum })

  return (
    <>
      <mesh geometry={geo} material={mat} />
      <mesh geometry={geo} material={mat} rotation={[Math.PI, 0, 0]} />
    </>
  )
}

// ─── Nested dipole field-line "cage" ──────────────────────────────────────────
function FieldLines({ density, bfield }) {
  const geos = useMemo(() => {
    const shells = [2.2, 3.1, 4.3]
    const az = Math.max(3, Math.round(density))
    const Rstar = 1.06
    const out = []
    for (const L of shells)
      for (let i = 0; i < az; i++) out.push(buildDipole(L, (i / az) * Math.PI * 2, Rstar))
    return out
  }, [density])

  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.55, 0.85, 1.0), transparent: true,
    opacity: clamp(0.55 + 0.12 * bfield, 0, 1),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), [bfield])

  const haloMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.30, 0.60, 1.0), transparent: true,
    opacity: clamp(0.10 * bfield, 0, 0.5),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), [bfield])

  useEffect(() => () => geos.forEach((c) => { c.core.dispose(); c.halo.dispose() }), [geos])
  useEffect(() => () => { coreMat.dispose(); haloMat.dispose() }, [coreMat, haloMat])

  return geos.map((c, i) => (
    <group key={i}>
      <mesh geometry={c.core} material={coreMat} />
      <mesh geometry={c.halo} material={haloMat} />
    </group>
  ))
}

// ─── Faint blue ambient nebulosity behind everything ──────────────────────────
function AmbientGlow() {
  const tex = useMemo(() => makeGlowTexture(), [])
  return (
    <sprite scale={[34, 34, 1]} position={[0, 0, -6]}>
      <spriteMaterial map={tex} color="#16335c" transparent opacity={0.5}
        depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  )
}

// ─── Magnetosphere: star + tilted magnetic axis spinning about Y (lighthouse) ──
function Magnetosphere({ spin, obliquity, bfield, temp, jetLum, fieldDensity }) {
  const spinRef = useRef()
  useFrame((_, dt) => { if (spinRef.current) spinRef.current.rotation.y += dt * spin })
  const tilt = (obliquity * Math.PI) / 180

  return (
    <group ref={spinRef}>
      <StarCore temp={temp} />
      <group rotation={[0, 0, tilt]}>
        <FieldLines density={fieldDensity} bfield={bfield} />
        {jetLum > 0 && <Jets lum={jetLum} />}
      </group>
    </group>
  )
}

// ─── Observer distance rig (same idiom as the black-hole sim) ─────────────────
function ObserverRig({ distance }) {
  const camera   = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    if (!controls) return
    const dir = camera.position.clone().sub(controls.target)
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.25, 1)
    dir.normalize()
    camera.position.copy(controls.target).addScaledVector(dir, distance)
    controls.update()
  }, [distance, controls, camera])
  return null
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
      <button type="button" className="sim-type-tab sim-type-tab-active">
        <span className="sim-type-icon">✦</span>Neutron Star
      </button>
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('wormhole')}>
        <span className="sim-type-icon">◯</span>Wormhole
      </button>
    </div>
  )
}

// ─── Controls + physics ───────────────────────────────────────────────────────
const CONTROL_DEFS = [
  { key: 'spin',         label: 'Spin Rate',       min: 0.0, max: 3.0,  step: 0.05, unit: ' Ω' },
  { key: 'obliquity',    label: 'Magnetic Tilt',   min: 0,   max: 90,   step: 1,    unit: '°' },
  { key: 'bfield',       label: 'Magnetic Field',  min: 0.3, max: 3.0,  step: 0.05, unit: '×' },
  { key: 'temp',         label: 'Surface Temp',    min: 0.0, max: 1.0,  step: 0.02, unit: '' },
  { key: 'jetLum',       label: 'Jet Luminosity',  min: 0.0, max: 2.5,  step: 0.05, unit: '×' },
  { key: 'fieldDensity', label: 'Field Lines',     min: 3,   max: 12,   step: 1,    unit: '' },
  { key: 'observer',     label: 'Observer Dist.',  min: 6,   max: 40,   step: 1,    unit: ' R' },
]

const PHYSICS_CARDS = [
  {
    title: 'Neutron Degeneracy Pressure',
    body: 'A neutron star is held up not by fusion but by the Pauli exclusion principle: neutrons cannot share quantum states, producing a degeneracy pressure that resists gravity even after the core stops burning.',
    eq: String.raw`P_{\text{deg}} \propto \frac{\hbar^{2}}{m_{n}}\,n^{5/3}`,
  },
  {
    title: 'TOV Maximum Mass',
    body: 'The Tolman–Oppenheimer–Volkoff equation is the relativistic equation of hydrostatic equilibrium. Above ≈2.2 M⊙ degeneracy pressure loses to gravity and the star collapses into a black hole.',
    eq: String.raw`\frac{dP}{dr}=-\frac{G\,(\rho+P/c^{2})(m+4\pi r^{3}P/c^{2})}{r^{2}\,(1-2Gm/rc^{2})}`,
  },
  {
    title: 'Nuclear Density',
    body: 'Roughly 1.4 solar masses are crushed into a sphere ~12 km across. The matter reaches the density of an atomic nucleus — a sugar-cube of it would weigh as much as a mountain.',
    eq: String.raw`\rho \sim 2\text{–}4\times10^{17}\;\mathrm{kg\,m^{-3}}`,
  },
  {
    title: 'Surface Gravity & Redshift',
    body: 'Compactness is so extreme that light leaving the surface is gravitationally redshifted by ~35%, and the surface gravity is ~10¹¹ times Earth’s. General relativity is not optional here.',
    eq: String.raw`1+z=\left(1-\frac{2GM}{Rc^{2}}\right)^{-1/2}\approx 1.35`,
  },
  {
    title: 'Magnetic Dipole Geometry',
    body: 'To leading order the field is a dipole. Each field line follows r = L·sin²θ about the magnetic axis — exactly the nested loops drawn here. Surface fields range from 10⁸ G (millisecond pulsars) to 10¹⁵ G (magnetars).',
    eq: String.raw`r(\theta)=L\,\sin^{2}\theta,\qquad B\sim10^{8}\text{–}10^{15}\,\mathrm{G}`,
  },
  {
    title: 'Magnetic Dipole Spin-Down',
    body: 'A spinning, tilted dipole radiates electromagnetic energy, draining rotational kinetic energy so the star gradually slows. The loss scales with B², the spin Ω⁴, and the tilt angle α between the magnetic and spin axes.',
    eq: String.raw`\dot{E}=-\frac{B^{2}R^{6}\Omega^{4}\sin^{2}\alpha}{6c^{3}}`,
  },
  {
    title: 'Light Cylinder & Pulsar Beam',
    body: 'At the light cylinder co-rotating field lines would have to move at c. Beyond it the field opens up and accelerates particles into the polar beams. Because the magnetic axis is tilted, the beam sweeps space like a lighthouse — the pulse.',
    eq: String.raw`R_{\text{LC}}=\frac{c}{\Omega}`,
  },
  {
    title: 'Angular-Momentum Spin-Up',
    body: 'When the iron core collapses, angular momentum is conserved while the radius shrinks by ~10⁵. The result is a body that can rotate hundreds of times per second moments after birth.',
    eq: String.raw`I_{1}\Omega_{1}=I_{2}\Omega_{2}\;\Rightarrow\;\Omega\propto R^{-2}`,
  },
]

// Plain-language intro — shown first, mirrors the Dark Matter "Intro" tab.
const INTRO_CARDS = [
  {
    title: 'What is a neutron star?',
    body: 'The collapsed core left behind by a massive star’s supernova. About 1.4 solar masses are crushed into a city-sized sphere ~24 km across — so dense that a sugar-cube of it would weigh as much as a mountain.',
  },
  {
    title: 'What am I seeing?',
    body: 'The glowing blue sphere is the star’s searing plasma surface. The luminous loops are its magnetic dipole field, and the two beams along the magnetic axis are relativistic particle jets streaming from the poles.',
  },
  {
    title: 'Why does it pulse?',
    body: 'The magnetic axis is tilted from the spin axis, so as the star rotates the beams sweep through space like a lighthouse. If a beam crosses your line of sight you see regular pulses — that is a pulsar.',
  },
  {
    title: 'What can I change?',
    body: 'Open Controls to adjust the spin rate, magnetic tilt and field strength, surface temperature, jet luminosity, the number of field lines, and your viewing distance. The Physics tab covers the underlying equations.',
  },
]

function SidePanel({ values, onChange }) {
  const [open, setOpen] = useState(true)
  const [tab, setTab]   = useState('intro')

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
    <div className={`ns-panel ${open ? '' : 'ns-panel-collapsed'}`}>
      <button type="button" className="ns-panel-toggle"
        onClick={() => setOpen((o) => !o)} title={open ? 'Hide panel' : 'Show panel'}>
        {open ? '✕' : '⚙'}
      </button>
      {open && (
        <>
          <div className="ns-tabs">
            <button type="button"
              className={`ns-tab ${tab === 'intro' ? 'ns-tab-active' : ''}`}
              onClick={() => setTab('intro')}>Intro</button>
            <button type="button"
              className={`ns-tab ${tab === 'controls' ? 'ns-tab-active' : ''}`}
              onClick={() => setTab('controls')}>Controls</button>
            <button type="button"
              className={`ns-tab ${tab === 'physics' ? 'ns-tab-active' : ''}`}
              onClick={() => setTab('physics')}>Physics</button>
          </div>

          <div className="ns-panel-body">
            {tab === 'intro' && (
              <div className="ns-physics">
                <h2 className="ns-panel-title">Welcome</h2>
                {INTRO_CARDS.map((c) => (
                  <article key={c.title} className="ns-phys-card">
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                  </article>
                ))}
              </div>
            )}

            {tab === 'controls' && (
              <>
                <h2 className="ns-panel-title">Magnetar Parameters</h2>
                {CONTROL_DEFS.map(({ key, label, min, max, step, unit }) => (
                  <div key={key} className="ns-slider-row">
                    <div className="ns-slider-head">
                      <span>{label}</span>
                      <span className="ns-slider-val">
                        {values[key].toFixed(step < 1 ? 2 : 0)}{unit}
                      </span>
                    </div>
                    <input type="range" min={min} max={max} step={step}
                      value={values[key]}
                      onChange={(e) => onChange(key, parseFloat(e.target.value))} />
                  </div>
                ))}
              </>
            )}

            {tab === 'physics' && (
              <div className="ns-physics">
                <h2 className="ns-panel-title">Neutron-Star Physics</h2>
                {PHYSICS_CARDS.map((c) => (
                  <article key={c.title} className="ns-phys-card">
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                    <div className="ns-phys-eq">
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

// Low-pass smoothing with angular momentum: while a hand drives it the group
// tracks the gesture targets; when the hand leaves the frame it conserves its
// last angular velocity and coasts to a smooth stop instead of snapping to rest.
function GestureApply({ gestureRef, groupRef, enabled }) {
  useFrame(() => {
    const g = gestureRef.current
    const obj = groupRef.current
    if (!g || !obj) return
    advanceGesture(g, enabled)
    obj.rotation.x = g.curRotX
    obj.rotation.y = g.curRotY
    obj.scale.setScalar(g.curScale)
  })
  return null
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function NeutronStar({ onSwitchSim }) {
  const [params, setParams] = useState({
    spin: 0.6, obliquity: 22, bfield: 1.4, temp: 0.78,
    jetLum: 1.2, fieldDensity: 7, observer: 14,
  })
  const setParam = (key, v) => setParams((p) => ({ ...p, [key]: v }))
  const [gestureEnabled, setGestureEnabled] = useState(false)
  const gestureGroupRef = useRef(null)
  const gestureRef = useRef({
    targetRotX: 0, targetRotY: 0, targetScale: 1,
    curRotX: 0,    curRotY: 0,    curScale: 1,
    velRotX: 0,    velRotY: 0,    handPresent: false,
  })

  return (
    <div className="ns-sim">
      <SimTypeBar onSwitchSim={onSwitchSim} />
      <SidePanel values={params} onChange={setParam} />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 4, 14], fov: 50, near: 0.1, far: 600 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.8]}
      >
        <color attach="background" args={['#03060f']} />
        <fog attach="fog" args={['#03060f', 34, 130]} />
        <Stars radius={140} depth={70} count={4500} factor={4} saturation={0} fade speed={0.4} />
        <AmbientGlow />
        <group ref={gestureGroupRef}>
          <Magnetosphere
            spin={params.spin}
            obliquity={params.obliquity}
            bfield={params.bfield}
            temp={params.temp}
            jetLum={params.jetLum}
            fieldDensity={params.fieldDensity}
          />
        </group>
        <GestureApply gestureRef={gestureRef} groupRef={gestureGroupRef} enabled={gestureEnabled} />
        <ObserverRig distance={params.observer} />

        <OrbitControls
          makeDefault
          enableRotate
          enableZoom
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={50}
          zoomSpeed={0.8}
          rotateSpeed={0.6}
        />
      </Canvas>
      <HandGestureControl
        enabled={gestureEnabled}
        onToggle={() => setGestureEnabled((v) => !v)}
        gestureRef={gestureRef}
      />
    </div>
  )
}
