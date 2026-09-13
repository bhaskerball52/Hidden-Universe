// Shared building blocks for the stellar and orbital scenes: a limb-darkened
// star, its glow, a starfield, the main camera framing, a second "telescope"
// camera drawn into a corner of the same canvas, and the plot card overlay.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Stars } from '@react-three/drei'
import * as THREE from 'three'
import './StellarScene.css'

// Layer 1 holds scenery that only makes sense from the free camera (orbit
// lines, glow, labels). The telescope camera sees layer 0 alone, so its view is
// just the stellar disks and whatever is crossing them.
export const SCENERY = 1

const STAR_VERT = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vView;
  varying vec3 vObj;
  void main() {
    vObj = position;
    vNormalV = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // projectionMatrix[3][3] is 1 for an orthographic camera, 0 for perspective.
    vView = projectionMatrix[3][3] > 0.5 ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

// Limb darkening is evaluated against the direction to whichever camera is
// drawing, so the edge darkens correctly from any angle, not baked on one side.
const STAR_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uU1;
  uniform float uU2;
  uniform float uTime;
  uniform float uGran;
  varying vec3 vNormalV;
  varying vec3 vView;
  varying vec3 vObj;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    float mu = clamp(dot(normalize(vNormalV), normalize(vView)), 0.0, 1.0);
    float m = 1.0 - mu;
    float I = 1.0 - uU1 * m - uU2 * m * m;
    // Convective granulation: a few percent, fading toward the limb where the
    // cells are foreshortened into nothing.
    vec3 q = normalize(vObj) * uGran;
    float g = noise(q + vec3(0.0, uTime * 0.07, 0.0)) * 0.65
            + noise(q * 2.3 - vec3(uTime * 0.05)) * 0.35;
    I *= 1.0 + (g - 0.5) * 0.14 * mu;
    // Push the centre past white so the core blooms while the limb keeps colour.
    vec3 col = uColor * I * 1.08 + vec3(pow(max(I, 0.0), 6.0) * 0.22);
    gl_FragColor = vec4(col, 1.0);
  }
`

export function StarBody({ radius = 1, color = '#fff1d6', u1 = 0.45, u2 = 0.22, granulation = 9, position, starRef }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color() },
      uU1: { value: 0 },
      uU2: { value: 0 },
      uTime: { value: 0 },
      uGran: { value: 9 },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
  }), [])
  useEffect(() => () => mat.dispose(), [mat])
  mat.uniforms.uColor.value.set(color)
  mat.uniforms.uU1.value = u1
  mat.uniforms.uU2.value = u2
  mat.uniforms.uGran.value = granulation
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt })

  return (
    <mesh ref={starRef} position={position} scale={radius} material={mat}>
      <sphereGeometry args={[1, 64, 48]} />
    </mesh>
  )
}

// Background starfield, kept out of the telescope's narrow view.
export function StarsBackdrop() {
  const ref = useRef(null)
  useEffect(() => { ref.current?.layers.set(SCENERY) }, [])
  return <Stars ref={ref} radius={120} depth={40} count={2200} factor={3.2} saturation={0} fade speed={0.25} />
}

// One radial-gradient texture shared by every glow in every scene.
let glowTexture = null
function getGlowTexture() {
  if (glowTexture) return glowTexture
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.22, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.14)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  glowTexture = new THREE.CanvasTexture(c)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  return glowTexture
}

export function Glow({ size = 6, color = '#ffd59a', opacity = 0.55, spriteRef }) {
  const map = getGlowTexture()
  return (
    <sprite ref={spriteRef} scale={[size, size, 1]} layers={SCENERY} renderOrder={-1}>
      <spriteMaterial
        map={map} color={color} transparent opacity={opacity}
        blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
      />
    </sprite>
  )
}

// A distant orthographic camera on the +z axis, which is the observer's line of
// sight in both scenes. It renders into the rectangle of `insetRef` after the
// main view, in the same canvas, so there is no second WebGL context.
export function TelescopeInset({ insetRef, halfHeight }) {
  const { gl, scene, camera } = useThree()
  const cam = useMemo(() => {
    const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
    c.position.set(0, 0, 200)
    c.lookAt(0, 0, 0)
    return c
  }, [])

  useFrame(() => {
    gl.setScissorTest(false)
    gl.render(scene, camera)

    const el = insetRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const c = gl.domElement.getBoundingClientRect()
    const w = r.width, h = r.height
    if (w < 4 || h < 4) return
    const x = r.left - c.left
    const y = c.bottom - r.bottom
    cam.left = -halfHeight * (w / h)
    cam.right = halfHeight * (w / h)
    cam.top = halfHeight
    cam.bottom = -halfHeight
    cam.updateProjectionMatrix()

    const bg = scene.background
    scene.background = null
    gl.setScissorTest(true)
    gl.setScissor(x, y, w, h)
    gl.setViewport(x, y, w, h)
    gl.setClearColor(0x010205, 1)
    gl.clear(true, true, false)
    gl.render(scene, cam)
    gl.setScissorTest(false)
    gl.setViewport(0, 0, c.width, c.height)
    scene.background = bg
  }, 1)

  return null
}

// Fades a transparent column out toward the telescope end.
let fadeTexture = null
function getFadeTexture() {
  if (fadeTexture) return fadeTexture
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#000')
  grad.addColorStop(1, '#fff')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 128)
  fadeTexture = new THREE.CanvasTexture(c)
  return fadeTexture
}

// Dashed line of sight from the system toward the observer on +z, with an
// arrowhead and label. `column` optionally draws the cylinder of sky, of that
// radius, that a body has to cross to eclipse the star.
export function Sightline({ start = 1, length, column = 0, label = 'to telescope' }) {
  const geo = useMemo(
    () => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, start), new THREE.Vector3(0, 0, length)]),
    [start, length],
  )
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <group>
      <line geometry={geo} layers={SCENERY} onUpdate={(l) => l.computeLineDistances()}>
        <lineDashedMaterial color="#9fb8ff" dashSize={0.35} gapSize={0.25} transparent opacity={0.6} />
      </line>
      {column > 0 && (
        <mesh position={[0, 0, length / 2]} rotation={[Math.PI / 2, 0, 0]} layers={SCENERY} renderOrder={2}>
          <cylinderGeometry args={[column, column, length, 48, 1, true]} />
          <meshBasicMaterial
            color="#9fb8ff" transparent opacity={0.13} alphaMap={getFadeTexture()}
            side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>
      )}
      <mesh position={[0, 0, length]} rotation={[Math.PI / 2, 0, 0]} layers={SCENERY}>
        <coneGeometry args={[0.16, 0.42, 20]} />
        <meshBasicMaterial color="#9fb8ff" />
      </mesh>
      <Html position={[0, 0.7 + column * 0.5, length * 0.82]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <span className="ss-tag">{label}</span>
      </Html>
    </group>
  )
}

// Main camera setup for these scenes: it sees the scenery layer, and its
// projection centre is shifted so the subject sits in the open part of the
// screen rather than under the panel and cards. Orbiting still pivots on the
// subject, because only the projection moves, not the camera.
export function MainCamera({ x = 180, y = 110, narrowY = 0.24, narrowZoom = 1.3 }) {
  const { camera, size } = useThree()
  const narrow = size.width <= 780
  useEffect(() => {
    camera.layers.enable(SCENERY)
    camera.setViewOffset(size.width, size.height, narrow ? 0 : x, narrow ? size.height * narrowY : y, size.width, size.height)
    camera.updateProjectionMatrix()
    return () => { camera.clearViewOffset() }
  }, [camera, size, narrow, x, y, narrowY])
  // A phone screen is a third as wide, so step the camera back to keep the
  // scene's width in view. Once per switch into or out of narrow layout.
  useEffect(() => {
    if (!narrow) return undefined
    camera.position.multiplyScalar(narrowZoom)
    return () => { camera.position.multiplyScalar(1 / narrowZoom) }
  }, [camera, narrow, narrowZoom])
  return null
}

export function InsetFrame({ insetRef, label, note, className = '' }) {
  return (
    <div ref={insetRef} className={`ss-inset ${className}`}>
      <span className="ss-inset-label">{label}</span>
      {note && <span className="ss-inset-note">{note}</span>}
    </div>
  )
}

export function CurveCard({ canvasRef, title, note, className = '' }) {
  return (
    <div className={`ss-curve ${className}`}>
      <div className="ss-curve-head">
        <span className="ss-curve-title">{title}</span>
        {note && <span className="ss-curve-note">{note}</span>}
      </div>
      <canvas ref={canvasRef} className="ss-curve-canvas" />
    </div>
  )
}
