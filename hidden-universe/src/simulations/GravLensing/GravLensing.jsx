import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SimSwitcher from '../shared/SimSwitcher'
import SimPanel from '../shared/SimPanel'
import '../shared/simBase.css'
import { images, totalMagnification } from './lens'

const ACCENT = '#a78bfa'

// Inverse ray shooting. For each pixel we know the direction we are looking
// (the image plane); the lens equation tells us which part of the source plane
// that ray actually came from, and we sample the background there. This is the
// honest way round: it needs no root-finding per pixel and handles every image
// at once, including the ring.
const FRAG = /* glsl */`
precision highp float;
uniform vec2      uRes;
uniform float     uTime;
uniform vec2      uLens;
uniform float     uThetaE;
uniform float     uShowRing;
uniform float     uShowGrid;
uniform sampler2D uSky;      // baked source plane

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) * 4.0;
  vec2 d = p - uLens;
  float r = length(d);

  // beta = theta - thetaE^2/theta, applied radially about the lens.
  float f = 1.0 - (uThetaE * uThetaE) / max(r * r, 1e-6);
  vec2 src = uLens + d * f;

  // One texture fetch instead of a procedural field: the lensing maths is
  // unchanged, but the per-pixel cost drops to a single lookup.
  vec2 uv = src * 0.11 + 0.5 + vec2(uTime * 0.004, uTime * 0.0015);
  vec3 col = texture2D(uSky, uv).rgb;

  // Magnification brightens the image, which is the observable effect.
  float mu = abs(1.0 / (1.0 - pow(uThetaE / max(r, 1e-4), 4.0)));
  col *= clamp(mu, 0.35, 3.2);

  if (uShowRing > 0.5){
    float ring = abs(r - uThetaE);
    col += vec3(0.55, 0.42, 1.0) * smoothstep(0.02, 0.0, ring) * 0.75;
  }

  if (uShowGrid > 0.5){
    vec2 gg = abs(fract(src * 1.5) - 0.5);
    float line = smoothstep(0.035, 0.0, min(gg.x, gg.y));
    col += vec3(0.3, 0.5, 0.8) * line * 0.33;
  }

  gl_FragColor = vec4(col, 1.0);
}
`

// The source plane, baked once on the CPU into a repeating texture. Generating
// it here rather than in the shader is what keeps the frame cost flat.
function makeSkyTexture() {
  const N = 512
  const data = new Uint8Array(N * N * 4)
  // Deterministic, so the field is the same every load.
  let seed = 0x2f6e2b1
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = 7; data[i * 4 + 1] = 8; data[i * 4 + 2] = 15; data[i * 4 + 3] = 255
  }
  const put = (cx, cy, rad, cr, cg, cb) => {
    const r0 = Math.ceil(rad)
    for (let dy = -r0; dy <= r0; dy++) {
      for (let dx = -r0; dx <= r0; dx++) {
        const dd = Math.hypot(dx, dy)
        if (dd > rad) continue
        const x = (cx + dx + N) % N, y = (cy + dy + N) % N
        const a = Math.pow(1 - dd / rad, 2)
        const i = (y * N + x) * 4
        data[i] = Math.min(255, data[i] + cr * a)
        data[i + 1] = Math.min(255, data[i + 1] + cg * a)
        data[i + 2] = Math.min(255, data[i + 2] + cb * a)
      }
    }
  }
  // A few hundred galaxies, a scattering of faint stars.
  for (let k = 0; k < 900; k++) {
    const warm = rand()
    put((rand() * N) | 0, (rand() * N) | 0, 4 + rand() * 12,
      170 + warm * 85, 158 + warm * 60, 205 - warm * 55)
  }
  for (let k = 0; k < 5200; k++) {
    put((rand() * N) | 0, (rand() * N) | 0, 1 + rand() * 2.0, 150, 168, 215)
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`

function LensQuad({ thetaE, showRing, showGrid, onLens }) {
  const { size } = useThree()
  const matRef = useRef(null)
  const lensRef = useRef(new THREE.Vector2(0, 0))
  const targetRef = useRef(new THREE.Vector2(0, 0))
  const pointerSeen = useRef(false)
  const tRef = useRef(0)

  const sky = useMemo(() => makeSkyTexture(), [])
  const uniforms = useMemo(() => ({
    uSky: { value: sky },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uLens: { value: new THREE.Vector2(0, 0) },
    uThetaE: { value: 1 },
    uShowRing: { value: 1 },
    uShowGrid: { value: 0 },
  }), [sky])

  useFrame((state, dt) => {
    const u = uniforms
    u.uRes.value.set(size.width, size.height)
    u.uTime.value += dt
    u.uThetaE.value = thetaE
    u.uShowRing.value = showRing ? 1 : 0
    u.uShowGrid.value = showGrid ? 1 : 0

    // The lens follows the pointer, eased, so dragging it across the field is
    // the main interaction. Before the pointer is ever used it drifts on a slow
    // Lissajous path, so the lensing is visible the moment the scene loads
    // rather than waiting to be discovered.
    tRef.current += dt
    const pt = state.pointer
    if (Math.abs(pt.x) > 1e-4 || Math.abs(pt.y) > 1e-4) pointerSeen.current = true
    const ar = size.width / Math.min(size.width, size.height)
    if (pointerSeen.current) {
      targetRef.current.set(pt.x * 2.0 * ar,
                            pt.y * 2.0 * (size.height / Math.min(size.width, size.height)))
    } else {
      const t = tRef.current * 0.34
      targetRef.current.set(Math.sin(t) * 1.5 * ar, Math.cos(t * 0.73) * 0.95)
    }
    lensRef.current.lerp(targetRef.current, 0.09)
    u.uLens.value.copy(lensRef.current)
    onLens?.(lensRef.current.length())
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={matRef} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} depthWrite={false} />
    </mesh>
  )
}

const INTRO = [
  { title: 'What am I looking at?', body: 'A field of background galaxies seen through a concentrated mass. Move the pointer and the mass moves with it, bending the light of whatever lies behind.' },
  { title: 'Why the ring?', body: 'When a source sits exactly behind the lens there is no preferred direction, so its image is smeared into a complete circle. That circle is the Einstein radius, the natural scale of the whole problem.' },
  { title: 'Why two images?', body: 'Off perfect alignment the ring breaks into two: a bright one outside the Einstein radius and a faint, mirror-reversed one inside it. The scene solves for both every pixel.' },
  { title: 'What can I change?', body: 'The lens mass sets the Einstein radius. Turn on the source grid to see the distortion directly, since a straight grid behind the lens comes through visibly bent.' },
]

const PHYSICS = [
  { title: 'The lens equation', body: 'Where a ray appears, minus the deflection, is where it came from. Written in units of the Einstein radius it reduces to this, which is what the shader solves per pixel.', eq: String.raw`\beta=\theta-\frac{\theta_{E}^{2}}{\theta}` },
  { title: 'Einstein radius', body: 'The angular scale set by the lens mass and the geometry. Everything about the image, its size and the separation of the pair, is measured in these units.', eq: String.raw`\theta_{E}=\sqrt{\frac{4GM}{c^{2}}\frac{D_{LS}}{D_{L}D_{S}}}` },
  { title: 'Two images, always', body: 'The lens equation is a quadratic, so a point mass always makes exactly two images. They straddle the ring, and the product of their positions is fixed.', eq: String.raw`\theta_{\pm}=\frac{\beta\pm\sqrt{\beta^{2}+4\theta_{E}^{2}}}{2},\qquad \theta_{+}\theta_{-}=-\theta_{E}^{2}` },
  { title: 'Magnification', body: 'Lensing conserves surface brightness but changes the solid angle, so the source looks brighter. The total magnification depends only on how well aligned things are.', eq: String.raw`\mu_{\text{tot}}=\frac{u^{2}+2}{u\sqrt{u^{2}+4}},\qquad u=\beta/\theta_{E}` },
]

const CONTROLS = [
  { key: 'thetaE', label: 'Lens mass (θE)', min: 0.15, max: 1.4, step: 0.01, unit: '' },
  { key: 'ring', label: 'Einstein ring', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
  { key: 'grid', label: 'Source grid', min: 0, max: 1, step: 1, unit: '', format: (v) => (v > 0.5 ? 'shown' : 'hidden') },
]

export default function GravLensing({ onSwitchSim }) {
  const [p, setP] = useState({ thetaE: 0.75, ring: 1, grid: 0 })
  const set = (k, v) => setP((q) => ({ ...q, [k]: v }))
  const [beta, setBeta] = useState(0)
  const lastRef = useRef(0)

  const onLens = (r) => {
    const now = performance.now()
    if (now - lastRef.current > 110) { lastRef.current = now; setBeta(r) }
  }

  const u = beta / p.thetaE
  const img = images(u)
  const readouts = [
    { label: 'Alignment u = β/θE', value: u.toFixed(3) },
    { label: 'Outer image', value: `${img.plus.toFixed(3)} θE` },
    { label: 'Inner image', value: `${img.minus.toFixed(3)} θE` },
    { label: 'Total magnification', value: u < 0.002 ? 'huge' : `${totalMagnification(u).toFixed(2)}×` },
    { label: 'Image separation', value: `${(img.plus - img.minus).toFixed(3)} θE` },
  ]

  return (
    <div className="sim2">
      <SimSwitcher current="gravLensing" onSwitchSim={onSwitchSim} />
      <SimPanel
        title="Gravitational lensing" accent={ACCENT}
        intro={INTRO} controls={CONTROLS} physics={PHYSICS}
        values={p} onChange={set} readouts={readouts}
      />
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.6]}
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
      >
        <LensQuad thetaE={p.thetaE} showRing={p.ring > 0.5} showGrid={p.grid > 0.5} onLens={onLens} />
      </Canvas>
      <div className="sim2-hud">
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">u = β/θE</span>
          <span className="sim2-hud-value">{u.toFixed(3)}</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">magnification</span>
          <span className="sim2-hud-value">{u < 0.002 ? '∞' : `${totalMagnification(u).toFixed(2)}×`}</span>
        </div>
        <div className="sim2-hud-item">
          <span className="sim2-hud-label">separation</span>
          <span className="sim2-hud-value">{(img.plus - img.minus).toFixed(2)} θE</span>
        </div>
      </div>
    </div>
  )
}
