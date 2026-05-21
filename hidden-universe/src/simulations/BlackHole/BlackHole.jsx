import { useMemo, memo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MathJaxContext, MathJax } from 'better-react-mathjax'
import * as THREE from 'three'
import './BlackHole.css'

// MathJax v3 config — load once for the side panel
const MATHJAX_CONFIG = {
  loader: { load: ['[tex]/ams', '[tex]/boldsymbol'] },
  tex: {
    packages: { '[+]': ['ams', 'boldsymbol'] },
    inlineMath:  [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
  },
}

// ─── Gravitationally lensed black hole (per-pixel geodesic ray-march) ────────
// A full-screen pass.  For every pixel a camera ray is bent around the hole by
// integrating the Schwarzschild null geodesic, then tested against a FLAT
// accretion disk.  Because the bending is recomputed from the live camera each
// frame, the Gargantua wrap, photon ring and secondary images are all correct
// from any of the 360° viewing angles — no faked geometry.
const LENS_VERT = /* glsl */`
  varying vec2 vNdc;
  void main() {
    vNdc = position.xy;                 // full-screen triangle in clip space
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`
const LENS_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vNdc;

  uniform vec3  uCamPos;
  uniform vec3  uCamF;     // camera forward (world)
  uniform vec3  uCamR;     // camera right
  uniform vec3  uCamU;     // camera up
  uniform float uTanHalf;  // tan(fov/2)
  uniform float uAspect;
  uniform float uTime;
  uniform float uSteps;    // active march steps (perf mode lowers this)

  // Slider-driven (JS precomputes the mass/spin-scaled radii each frame)
  uniform float uRS;       // horizon radius        (= 1 · mass)
  uniform float uRGlow;    // inner glow start      (mass & spin scaled)
  uniform float uRIn;      // full-density radius   (mass & spin scaled)
  uniform float uROut;     // disk outer edge       (= 15 · mass)
  uniform float uGrav;     // geodesic strength     (= 1.5 · mass)
  uniform float uTemp;     // disk colour temperature
  uniform float uThick;    // disk thickness multiplier
  uniform float uDensity;  // disk density multiplier
  uniform float uSpin;     // Kerr spin (0..~0.95) — frame-drag approximation
  uniform float uJetLum;   // jet luminosity multiplier
  uniform float uJetThick; // jet thickness multiplier

  const int STEPMAX = 360; // hard ceiling; uSteps breaks out earlier

  float h21(vec3 p){
    p = fract(p * vec3(127.1, 311.7, 74.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y * p.z);
  }
  // 3D value noise + fbm — gives the disk real volumetric cloud structure
  float vnoise(vec3 p){
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h21(i+vec3(0,0,0)), h21(i+vec3(1,0,0)), f.x),
          mix(h21(i+vec3(0,1,0)), h21(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(h21(i+vec3(0,0,1)), h21(i+vec3(1,0,1)), f.x),
          mix(h21(i+vec3(0,1,1)), h21(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p){
    // 3 octaves — one fewer than before; negligible visual loss, ~25% cheaper
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.05; a *= 0.5; }
    return s;
  }

  // Disk half-thickness — flares outward like a real accretion disk.
  // Thin slab: clearly volumetric, but far from the earlier bloated version.
  float diskHalfH(float r){ return (0.13 + 0.037 * r) * uThick; }

  // Volumetric disk sample: emission colour + local density at world point p,
  // with relativistic Doppler beaming toward the camera.
  void sampleDisk(vec3 p, out vec3 emis, out float dens){
    emis = vec3(0.0); dens = 0.0;
    float r = length(p.xz);
    if (r < uRGlow || r > uROut) return;
    float H = diskHalfH(r);
    float y = p.y;
    if (abs(y) > 3.0 * H) return;   // perf early-out only; vg fades smoothly

    // Soft inner ramp: emission begins faintly near the photon sphere and
    // ramps to full density by uRIn — no hard edge, so the band blends
    // continuously into the bright inner ring (kills the gap + dashed ring).
    float inner = smoothstep(uRGlow, uRIn, r);
    float t   = clamp((r - uRGlow) / (uROut - uRGlow), 0.0, 1.0);
    float ang = atan(p.z, p.x);
    float omega = 3.6 * pow(max(r, 0.05), -1.5);          // Keplerian
    float sw  = ang + omega * uTime;

    // Layered 3D turbulence — swirls in φ, banded in r, puffy in y
    vec3 q = vec3(cos(sw), y * 0.9, sin(sw)) * (1.2 + 1.6 * t);
    float n1 = fbm3(q * 1.4 + vec3(0.0, uTime * 0.15, 0.0));
    float n2 = fbm3(q * 3.3 - vec3(uTime * 0.20, 0.0, 0.0));
    float fil = pow(n1 * 0.62 + n2 * 0.38, 1.25);

    // Soft puffy vertical profile (thick, not a sheet)
    float vg = exp(-(y * y) / (2.0 * (H * 0.52) * (H * 0.52)));
    float radial = inner * smoothstep(1.0, 0.82, t);

    vec3 col;
    if      (t < 0.16) col = mix(vec3(1.00,0.96,0.78), vec3(1.00,0.64,0.20), t/0.16);
    else if (t < 0.48) col = mix(vec3(1.00,0.64,0.20), vec3(0.88,0.32,0.06), (t-0.16)/0.32);
    else               col = mix(vec3(0.88,0.32,0.06), vec3(0.26,0.06,0.01), (t-0.48)/0.52);
    col = max(col * (0.40 + 1.10 * fil), vec3(0.0));

    // ── Colour temperature ────────────────────────────────────────────────
    // uTemp: <1 cooler/redder ember, 1 ≈ neutral, >1 hotter blue-white.
    float kT = clamp((uTemp - 0.3) / 1.7, 0.0, 1.0);
    col.r *= mix(1.25, 0.85, kT);
    col.g *= mix(0.95, 0.98, kT);
    col.b *= mix(0.22, 2.20, kT);

    // ── Relativistic transfer: full Doppler + gravitational redshift ──────
    // Orbital velocity is tangential (counter-clockwise about +Y).
    vec3 vhat  = normalize(vec3(-p.z, 0.0, p.x));
    vec3 toCam = normalize(uCamPos - p);
    // Schwarzschild circular β ∝ 1/√r; spin boosts inner orbital speed.
    float beta = min((0.62 + 0.55 * uSpin) / sqrt(max(r, 1.0)), 0.86);
    // Full relativistic Doppler factor  δ = 1 / [γ (1 − β·n̂)]
    float gamma = inversesqrt(max(1.0 - beta * beta, 1e-3));
    float dop   = 1.0 / (gamma * (1.0 - beta * dot(vhat, toCam)));
    // Gravitational redshift  g = √(1 − r_s / r)   (time dilation on photons)
    float grav  = sqrt(clamp(1.0 - uRS / max(r, uRS * 1.0001), 0.0, 1.0));
    // Combined energy ratio E_obs / E_emit  (clamped to keep inner disk visible)
    float shift = clamp(dop * grav, 0.35, 3.0);
    // I_obs ∝ shift^3 (specific intensity is δ³ invariant); pow 3.2 for bolometric-ish punch
    col *= pow(shift, 3.2);
    // Frequency-shift tint: blueshift → cooler-white, redshift → deep red
    col = mix(col * vec3(1.25, 0.55, 0.18), col, clamp(shift, 0.0, 1.0));
    col = mix(col, col * vec3(0.78, 0.86, 1.18), clamp((shift - 1.0) * 0.7, 0.0, 0.5));

    emis = col;
    dens = vg * radial * (0.30 + 0.95 * fil) * uDensity;
  }

  // Volumetric polar jet — bright "flashlight" beams along the ±Y spin axis.
  // Sampled inside the ray march so it inherits gravitational lensing for free.
  void sampleJet(vec3 p, out vec3 emis, out float dens){
    emis = vec3(0.0); dens = 0.0;
    float ay = abs(p.y);
    // Jets launch just outside the disk's vertical extent and extend far out.
    if (ay < uRS * 1.4 || ay > uROut * 2.4) return;

    float rcyl = length(p.xz);
    // Slight conical flare: narrow at the base, widening with altitude.
    // uJetThick scales the whole cross-section.
    float coneR = (uRS * 0.50 + ay * 0.085) * uJetThick;
    if (rcyl > coneR * 2.2) return;

    // Soft Gaussian "flashlight" cross-section — fat core, smooth fade.
    float c2   = coneR * coneR * 1.4;
    float core = exp(-(rcyl * rcyl) / c2);

    // Length envelope: brightest near the base, exponential fade outward.
    float along     = (ay - uRS * 1.4) / max(uROut * 2.4 - uRS * 1.4, 1e-3);
    float lengthEnv = exp(-along * 1.9) * smoothstep(0.0, 0.15, along);

    // Frame-drag twist: spin winds the beam helically along its length.
    float dir   = sign(p.y);
    float ang   = atan(p.z, p.x) + uSpin * 5.0 * along * dir;
    // Turbulent filamentary substructure — knots / blobs flowing outward.
    vec3 q = vec3(cos(ang) * rcyl, p.y * 0.22, sin(ang) * rcyl) * 0.9;
    float n1 = fbm3(q * 1.3 + vec3(0.0, uTime * 0.55 * dir, 0.0));
    float n2 = fbm3(q * 3.0 - vec3(uTime * 0.30 * dir, 0.0, 0.0));
    float fil = n1 * 0.65 + n2 * 0.35;

    // Hot blue-white synchrotron core, cooler violet at the sheath.
    vec3 hot  = vec3(1.55, 1.75, 2.30);
    vec3 edge = vec3(0.45, 0.38, 1.15);
    vec3 col  = mix(edge, hot, core);
    col *= (0.55 + 1.10 * fil);

    emis = col * 0.95 * uJetLum;
    dens = core * lengthEnv * (0.45 + 0.85 * fil) * 0.42 * uDensity;
  }

  void main(){
    vec3 dir = normalize(uCamF
      + vNdc.x * uTanHalf * uAspect * uCamR
      + vNdc.y * uTanHalf * uCamU);

    vec3 pos = uCamPos;
    vec3 vel = dir;

    // Conserved angular momentum² for the Schwarzschild photon equation:
    //   d²x/dλ² = -1.5 h² x / r⁵     (units r_s = 1)
    vec3  hv = cross(pos, vel);
    float h2 = dot(hv, hv);

    vec3  accum = vec3(0.0);

    // Per-pixel dither phase.  Used to randomise WHERE inside each step the
    // disk is sampled, so coherent step-quantisation banding (the blocky
    // outer-edge tiles and the dashed lensed ring) breaks up into fine noise
    // the eye integrates as smooth — at ZERO extra marching cost.
    float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))
                      * 43758.5453);

    // Schwarzschild coefficient scaled by mass (r_s = uGrav/1.5)
    float kGR = -uGrav * h2;
    float rEsc = uROut * 4.0;          // escape radius scales with the disk

    for (int i = 0; i < STEPMAX; i++) {
      if (float(i) >= uSteps) break;                       // perf-mode ceiling
      float r2 = dot(pos, pos);
      float r  = sqrt(r2);

      if (r < uRS) break;                                  // captured → shadow
      if (r > rEsc && dot(pos, vel) > 0.0) break;          // escaped to sky

      float rxz   = length(pos.xz);
      float Hslab = diskHalfH(min(rxz, uROut));

      // Curvature-aware step.  Light bending near the photon sphere (r≈1.5–3)
      // is extreme — that is where the lensed TOP image is formed — so the
      // step must be tiny there or strongly-bent rays land in the wrong place
      // per pixel and the top layer tears apart near edge-on.  Far from the
      // hole spacetime is ~flat, so big strides are accurate and cheap.
      float dt;
      if      (r < uRS * 6.0)    dt = clamp(0.045 * r, 0.012 * uRS, 0.26 * uRS);
      else if (r < uROut + 4.0)  dt = clamp(0.07  * r, 0.04,  0.50);  // disk region
      else                       dt = clamp(0.32  * r, 0.05,  2.6);   // far field

      // Inside / skimming the thin disk slab → force fine sampling so grazing
      // (near edge-on) rays integrate the long in-plane path without tearing.
      if (rxz < uROut + 1.5 && abs(pos.y) < Hslab + 0.45)
        dt = min(dt, 0.05 * uRS);

      // Near the spin axis (jet column) → keep steps small so the bright
      // narrow beam doesn't alias into broken segments at distance.
      // Skipped when jets are off so the BH march keeps its original speed.
      if (uJetLum > 0.0 && uJetThick > 0.0) {
        float ayp = abs(pos.y);
        if (rxz < uRS * 2.2 && ayp > uRS * 1.0 && ayp < uROut * 2.4)
          dt = min(dt, 0.22);
      }

      // 1/r⁵ via multiplies (r already known) instead of two pow() calls.
      // Spin adds an approximate frame-drag: a tangential (equatorial) tug
      // ∝ uSpin / r⁴ that swirls the lensed image — the Kerr asymmetry.
      vec3  tang = vec3(-pos.z, 0.0, pos.x);
      vec3  drag = (1.6 * uSpin) * tang / (r2 * r2 + 1.0);
      vec3  acc = kGR * pos / (r2 * r2 * r) + drag;
      vec3  np  = pos + vel * dt + 0.5 * acc * dt * dt;
      float nr2 = dot(np, np);
      float nr  = sqrt(nr2);
      vec3  ntang = vec3(-np.z, 0.0, np.x);
      vec3  na  = kGR * np / (nr2 * nr2 * nr) + (1.6 * uSpin) * ntang / (nr2 * nr2 + 1.0);
      vec3  nv  = vel + 0.5 * (acc + na) * dt;              // velocity Verlet

      // OPTICALLY THIN — pure emission, NO absorption.  The near side, the
      // lensed far side and secondary images all simply ADD, so nothing can
      // occlude anything: there is no dark self-occlusion wedge by
      // construction, and the regions join continuously.  The shadow stays
      // black because captured rays accumulate nothing.
      // Sample at a per-pixel-jittered point within the step (not the fixed
      // midpoint) — decorrelates the banding/dashing into smooth fine noise.
      vec3 mp = mix(pos, np, 0.18 + 0.64 * jit);
      vec3 emis; float dens;
      sampleDisk(mp, emis, dens);
      accum += emis * dens * dt * 2.6;

      // Jets: sampled volumetrically just like the disk so they get the same
      // gravitational lensing for free (they bend visibly near the horizon).
      // Guarded so a disabled jet adds zero per-step cost to the BH march.
      if (uJetLum > 0.0 && uJetThick > 0.0) {
        vec3 jemis; float jdens;
        sampleJet(mp, jemis, jdens);
        accum += jemis * jdens * dt * 2.8;
      }

      pos = np; vel = nv;
    }

    // Tonemap so overlapping bright images saturate gracefully instead of
    // hard-clipping (keeps the hot inner ring from blowing out to flat white).
    vec3 col = vec3(1.0) - exp(-accum * 1.15);
    gl_FragColor = vec4(col, 1.0);
  }
`

const LensedBlackHole = memo(function LensedBlackHole({
  highPerf, mass, temperature, thickness, density, spin, jetLum, jetThick,
}) {
  const { camera, size } = useThree()

  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    // One oversized triangle covering the whole screen in clip space
    g.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0,  3, -1, 0,  -1, 3, 0]), 3))
    const m = new THREE.ShaderMaterial({
      vertexShader: LENS_VERT,
      fragmentShader: LENS_FRAG,
      uniforms: {
        uCamPos:   { value: new THREE.Vector3() },
        uCamF:     { value: new THREE.Vector3() },
        uCamR:     { value: new THREE.Vector3() },
        uCamU:     { value: new THREE.Vector3() },
        uTanHalf:  { value: 0.5 },
        uAspect:   { value: 1 },
        uTime:     { value: 0 },
        uSteps:    { value: 210 },
        uRS:       { value: 1.0 },
        uRGlow:    { value: 1.7 },
        uRIn:      { value: 3.0 },
        uROut:     { value: 15.0 },
        uGrav:     { value: 1.5 },
        uTemp:     { value: 1.0 },
        uThick:    { value: 1.0 },
        uDensity:  { value: 1.0 },
        uSpin:     { value: 0.0 },
        uJetLum:   { value: 1.0 },
        uJetThick: { value: 1.0 },
      },
      depthTest: false,
      depthWrite: false,
    })
    return { geo: g, mat: m }
  }, [])

  useFrame((_, dt) => {
    camera.updateMatrixWorld()
    const e = camera.matrixWorld.elements
    const U = mat.uniforms
    U.uCamPos.value.setFromMatrixPosition(camera.matrixWorld)
    U.uCamR.value.set(e[0],  e[1],  e[2]).normalize()
    U.uCamU.value.set(e[4],  e[5],  e[6]).normalize()
    U.uCamF.value.set(-e[8], -e[9], -e[10]).normalize()
    U.uTanHalf.value = Math.tan((camera.fov * Math.PI / 180) / 2)
    U.uAspect.value  = size.width / size.height
    U.uTime.value   += dt
    // Perf mode trims steps only slightly (too few = the disk gap); the real
    // FPS win comes from the lower render resolution set on the Canvas dpr.
    U.uSteps.value = highPerf ? 240 : 340

    // Slider-driven physics.  Mass scales every radius + gravity strength;
    // spin pulls the inner edge inward (prograde ISCO shrinks with spin).
    const sIn = 1.0 - 0.45 * spin
    U.uRS.value     = 1.0  * mass
    U.uRGlow.value  = 1.7  * mass * sIn
    U.uRIn.value    = 3.0  * mass * sIn
    U.uROut.value   = 15.0 * mass
    U.uGrav.value   = 1.5  * mass
    U.uTemp.value   = temperature
    U.uThick.value  = thickness
    U.uDensity.value = density
    U.uSpin.value   = spin
    U.uJetLum.value   = jetLum
    U.uJetThick.value = jetThick
  })

  return (
    <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-1} />
  )
})


// ─── Simulation type nav ──────────────────────────────────────────────────────
function SimTypeBar({ onSwitchSim }) {
  return (
    <div className="sim-type-bar">
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('darkMatter')}>
        <span className="sim-type-icon">◉</span>Dark Matter
      </button>
      <button type="button" className="sim-type-tab sim-type-tab-active">
        <span className="sim-type-icon">⬡</span>Kerr Black Hole
      </button>
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('neutronStar')}>
        <span className="sim-type-icon">✦</span>Neutron Star
      </button>
    </div>
  )
}

// ─── High-performance mode toggle ─────────────────────────────────────────────
function PerfToggle({ value, onChange }) {
  return (
    <label className="bh-perf-toggle">
      <span>High Performance Mode</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

// ─── Observer distance rig ────────────────────────────────────────────────────
// Repositions the camera along its current view direction when the slider
// changes; OrbitControls still owns rotation/zoom afterward.
function ObserverRig({ distance }) {
  const camera   = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    if (!controls) return
    const target = controls.target
    const dir = camera.position.clone().sub(target)
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.2, 1)
    dir.normalize()
    camera.position.copy(target).addScaledVector(dir, distance)
    controls.update()
  }, [distance, controls, camera])
  return null
}

// ─── Controls sidebar ─────────────────────────────────────────────────────────
const CONTROL_DEFS = [
  { key: 'mass',        label: 'Mass',             min: 0.5, max: 3.0,  step: 0.05, unit: 'M⊙ₛ' },
  { key: 'temperature', label: 'Temperature',      min: 0.3, max: 2.0,  step: 0.05, unit: '×' },
  { key: 'thickness',   label: 'Disk Thickness',   min: 0.3, max: 3.0,  step: 0.05, unit: '×' },
  { key: 'observer',    label: 'Observer Distance', min: 10, max: 80,   step: 1,    unit: 'rₛ' },
  { key: 'density',     label: 'Disk Density',     min: 0.2, max: 3.0,  step: 0.05, unit: '×' },
  { key: 'spin',        label: 'Spin (a)',         min: 0.0, max: 0.95, step: 0.01, unit: '' },
  { key: 'jetLum',      label: 'Jet Luminosity',   min: 0.0, max: 2.5,  step: 0.05, unit: '×' },
  { key: 'jetThick',    label: 'Jet Thickness',    min: 0.0, max: 2.5,  step: 0.05, unit: '×' },
]

// Physics primer — concise, tied to what the shader is doing.
// Equations rendered with MathJax (LaTeX, no delimiters — wrapped at render).
const PHYSICS_CARDS = [
  {
    title: 'Schwarzschild Metric',
    body: 'Spacetime around a non-rotating black hole of mass M. The metric tells geodesics how to bend; everything else follows from it.',
    eq: String.raw`ds^{2}=-\!\left(1-\frac{r_{s}}{r}\right)\!c^{2}dt^{2}+\left(1-\frac{r_{s}}{r}\right)^{\!-1}\!dr^{2}+r^{2}d\Omega^{2},\quad r_{s}=\frac{2GM}{c^{2}}`,
  },
  {
    title: 'Event Horizon',
    body: 'The one-way surface at r = rₛ. Inside, every future-directed path leads inward; not even light escapes. In the sim, rays that cross r = rₛ are captured and contribute nothing — that is the perfectly black shadow.',
    eq: String.raw`r_{\text{horizon}} = r_{s}`,
  },
  {
    title: 'Photon Sphere & Shadow',
    body: 'Massless particles can orbit on an unstable circular orbit at r = 1.5 rₛ. Rays grazing it pile up into the bright thin "photon ring" you see hugging the shadow. The apparent shadow radius is √27/2 · rₛ ≈ 2.6 rₛ — this emerges from the ray-march, not hardcoded.',
    eq: String.raw`r_{\text{ph}}=\tfrac{3}{2}\,r_{s},\quad b_{\text{crit}}=\tfrac{3\sqrt{3}}{2}\,r_{s}`,
  },
  {
    title: 'ISCO — Innermost Stable Orbit',
    body: 'The smallest stable circular orbit for matter. For Schwarzschild it sits at 3 rₛ (= 6GM/c²); the disk inner edge in the sim is built to ramp up to full density here. Spin shrinks the prograde ISCO — the Spin slider pulls the bright inner edge inward.',
    eq: String.raw`r_{\text{ISCO}}=3\,r_{s}\quad(a=0)`,
  },
  {
    title: 'Null Geodesics (Lensing)',
    body: 'Light follows null geodesics. In the equatorial plane the orbit equation in 1/r is the Binet form below. The shader integrates the equivalent 3D acceleration  d²x/dλ² = −1.5 rₛ h² x / r⁵  with velocity-Verlet, producing the Gargantua "wrap" automatically.',
    eq: String.raw`\frac{d^{2}u}{d\varphi^{2}}+u=\tfrac{3}{2}\,r_{s}\,u^{2},\quad u=\tfrac{1}{r}`,
  },
  {
    title: 'Gravitational Time Dilation',
    body: 'Clocks at radius r tick slower than at infinity by √(1 − rₛ/r); at the horizon they freeze. This is the same factor that redshifts the light below.',
    eq: String.raw`\frac{d\tau}{dt}=\sqrt{1-\dfrac{r_{s}}{r}}`,
  },
  {
    title: 'Gravitational Redshift',
    body: 'Photons climbing out of the well lose energy. The sim multiplies disk emission by g = √(1 − rₛ/r), darkening and reddening the inner ring — the same effect that makes the EHT M87 image asymmetric in color.',
    eq: String.raw`1+z=\frac{1}{\sqrt{1-r_{s}/r}},\qquad E_{\text{obs}}=g\,E_{\text{emit}}`,
  },
  {
    title: 'Relativistic Doppler Beaming',
    body: 'Disk material orbits at a meaningful fraction of c (β ∝ 1/√r for Schwarzschild circular orbits). The side rotating toward you is brighter and bluer; the receding side is dimmer and redder. The shader uses the full δ = 1/[γ(1 − β·n̂)] and raises observed intensity to δ^3.2 (between the δ³ specific-intensity invariant and the δ⁴ bolometric limit).',
    eq: String.raw`\delta=\frac{1}{\gamma\,(1-\boldsymbol{\beta}\!\cdot\!\hat{\mathbf{n}})},\quad I_{\text{obs}}\propto\delta^{\,3\ldots 4}`,
  },
  {
    title: 'Kerr Metric & Frame-Dragging',
    body: 'A spinning black hole drags spacetime itself around with it (Lense-Thirring effect). The Spin slider feeds an a/r⁴ tangential pull into the geodesic and boosts the orbital β — a tractable approximation of the full Kerr metric in Boyer-Lindquist coordinates.',
    eq: String.raw`a=\frac{J}{M c},\qquad 0\le a\le M\;(\text{extremal})`,
  },
  {
    title: 'Optically-Thin Emission',
    body: 'The disk is modelled as glowing transparent gas: every ray accumulates emission with NO absorption. That is why the near side does not occlude the lensed far side — the same physical assumption used in Interstellar / EHT renders.',
    eq: String.raw`I_{\nu}(\lambda)=\int j_{\nu}(s)\,ds\quad(\text{no opacity term})`,
  },
]

function SidePanel({ values, onChange }) {
  const [open, setOpen] = useState(true)
  const [tab, setTab]   = useState('controls')

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
    <div className={`bh-panel ${open ? '' : 'bh-panel-collapsed'}`}>
      <button
        type="button"
        className="bh-panel-toggle"
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Hide panel' : 'Show panel'}
      >
        {open ? '✕' : '⚙'}
      </button>
      {open && (
        <>
          <div className="bh-tabs">
            <button
              type="button"
              className={`bh-tab ${tab === 'controls' ? 'bh-tab-active' : ''}`}
              onClick={() => setTab('controls')}
            >
              Controls
            </button>
            <button
              type="button"
              className={`bh-tab ${tab === 'physics' ? 'bh-tab-active' : ''}`}
              onClick={() => setTab('physics')}
            >
              Physics
            </button>
          </div>

          <div className="bh-panel-body">
            {tab === 'controls' && (
              <>
                <h2 className="bh-panel-title">Kerr Parameters</h2>
                {CONTROL_DEFS.map(({ key, label, min, max, step, unit }) => (
                  <div key={key} className="bh-slider-row">
                    <div className="bh-slider-head">
                      <span>{label}</span>
                      <span className="bh-slider-val">
                        {values[key].toFixed(step < 1 ? 2 : 0)}{unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={values[key]}
                      onChange={(e) => onChange(key, parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </>
            )}

            {tab === 'physics' && (
              <div className="bh-physics">
                <h2 className="bh-panel-title">Relativistic Physics</h2>
                {PHYSICS_CARDS.map((c) => (
                  <article key={c.title} className="bh-phys-card">
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                    <div className="bh-phys-eq">
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
export default function BlackHole({ onSwitchSim }) {
  const [highPerf, setHighPerf] = useState(true)
  const [params, setParams] = useState({
    mass: 1.0, temperature: 1.0, thickness: 1.0,
    observer: 26, density: 1.0, spin: 0.0,
    jetLum: 0.0, jetThick: 0.0,
  })
  const setParam = (key, v) => setParams((p) => ({ ...p, [key]: v }))

  return (
    <div className="bh-sim">
      <SimTypeBar onSwitchSim={onSwitchSim} />
      <PerfToggle value={highPerf} onChange={setHighPerf} />
      <SidePanel values={params} onChange={setParam} />
      <Canvas
        style={{ background: '#000000', width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 5, 26], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance',
              stencil: false, depth: false }}
        dpr={highPerf ? 0.65 : 1.2}
        flat
      >
        <LensedBlackHole
          highPerf={highPerf}
          mass={params.mass}
          temperature={params.temperature}
          thickness={params.thickness}
          density={params.density}
          spin={params.spin}
          jetLum={params.jetLum}
          jetThick={params.jetThick}
        />
        <ObserverRig distance={params.observer} />

        <OrbitControls
          makeDefault
          enableRotate
          enableZoom
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={8}
          maxDistance={90}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI - 0.05}
          zoomSpeed={0.75}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  )
}
