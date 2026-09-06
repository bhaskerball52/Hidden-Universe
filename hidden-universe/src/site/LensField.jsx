import { useEffect, useRef } from 'react'
import './LensField.css'

// The site's background from the hero onward: a field of stars where the cursor
// acts as an invisible point mass. Every star is displaced by the real
// point-mass lens equation, so each splits into a bright outer image and a faint
// inner counter-image, and a star passing directly behind the cursor closes into
// an Einstein ring.
//
// For a source at angular offset b from the lens, with Einstein radius e:
//   t± = (b ± sqrt(b² + 4e²)) / 2      image positions
//   µ± = 1 / (1 - (e/t±)⁴)             magnification
//
// It is a fixed layer behind the whole page, so it fades in as the hero scrolls
// away and then stays for the rest of the site. 2D canvas, no dependencies.

const STAR_DENSITY = 1 / 950 // stars per px², independent of viewport size
const EINSTEIN_FRACTION = 0.13 // of the smaller viewport dimension

const rand = (a, b) => a + Math.random() * (b - a)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export default function LensField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let stars = []
    let raf = 0
    let running = true
    let fade = 0 // eased toward the scroll-driven target

    // The lens rests centre-screen until the pointer takes over.
    const lens = { x: 0, y: 0, tx: 0, ty: 0, grip: 0, tgrip: 0 }

    const seed = () => {
      stars = []
      const count = Math.min(1500, Math.round(w * h * STAR_DENSITY))
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(0.5, 1.7),
          a: rand(0.3, 1),
          vx: rand(0.006, 0.03), // slow drift, so the field lives without a cursor
          vy: rand(-0.006, 0.006),
          tw: rand(0.0006, 0.002),
          ph: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.14,
        })
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, window.innerWidth)
      h = Math.max(1, window.innerHeight)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lens.x = lens.tx = w * 0.5
      lens.y = lens.ty = h * 0.5
      seed()
    }

    // Brightness follows the magnification, which is the whole point: µ₊ is ~1
    // far from the lens and climbs near the ring, while µ₋ tends to 0 far away,
    // so counter-images fade out instead of piling up inside the ring as a
    // uniform smudge.
    function paint(s, x, y, mag, t) {
      if (x < -8 || x > w + 8 || y < -8 || y > h + 8) return
      const flicker = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * s.tw + s.ph)
      const r = Math.max(0.28, s.r * Math.min(1.7, 0.7 + mag * 0.35))
      const a = Math.min(1, s.a * flicker * fade * Math.min(1.9, mag))
      if (a <= 0.004) return
      ctx.globalAlpha = a
      ctx.fillStyle = s.warm ? '#ffd9c2' : '#dce8ff'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      // A magnified image blooms, which is what makes a star crossing the ring
      // read as an event rather than a moving dot.
      if (mag > 1.5) {
        ctx.globalAlpha = a * 0.16
        ctx.beginPath()
        ctx.arc(x, y, r * 4.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const draw = (t) => {
      // Fade in as the hero scrolls away, then stay for the rest of the page.
      const vh = window.innerHeight || 1
      const target = clamp01((window.scrollY - vh * 0.3) / (vh * 0.45))
      fade += (target - fade) * 0.12

      ctx.clearRect(0, 0, w, h)
      if (fade < 0.005) {
        raf = running ? requestAnimationFrame(draw) : 0
        return
      }

      const e = Math.min(w, h) * EINSTEIN_FRACTION
      const e2 = e * e
      const e4 = e2 * e2

      lens.x += (lens.tx - lens.x) * 0.12
      lens.y += (lens.ty - lens.y) * 0.12
      lens.grip += (lens.tgrip - lens.grip) * 0.08

      for (const s of stars) {
        if (!reduced) {
          s.x += s.vx
          s.y += s.vy
          if (s.x > w + 4) s.x = -4
          if (s.y > h + 4) s.y = -4
          else if (s.y < -4) s.y = h + 4
        }

        const dx = s.x - lens.x
        const dy = s.y - lens.y
        const b = Math.hypot(dx, dy)
        if (b < 0.001) continue
        const ux = dx / b
        const uy = dy / b
        const root = Math.sqrt(b * b + 4 * e2)
        // Blend unlensed -> lensed so the field settles when the pointer leaves.
        const tPlus = b + (0.5 * (b + root) - b) * lens.grip
        const tMinus = 0.5 * (b - root) * lens.grip

        // Primary image: outside the ring, magnification >= 1.
        const magPlus = 1 / Math.max(0.08, 1 - e4 / Math.pow(Math.max(tPlus, 0.001), 4))
        paint(s, lens.x + ux * tPlus, lens.y + uy * tPlus, Math.min(2.6, Math.abs(magPlus)), t)

        // Counter-image: inside the ring, on the far side. |µ₋| falls off fast
        // with distance, so only stars near the lens produce a visible one.
        if (lens.grip > 0.01) {
          const magMinus = 1 / Math.max(0.08, Math.abs(1 - e4 / Math.pow(Math.min(tMinus, -0.001), 4)))
          paint(s, lens.x + ux * tMinus, lens.y + uy * tMinus, Math.min(2.2, magMinus) * lens.grip, t)
        }
      }
      ctx.globalAlpha = 1
      raf = running ? requestAnimationFrame(draw) : 0
    }

    // The layer is pointer-events:none so the page stays clickable; the pointer
    // is tracked on the window instead.
    const onMove = (ev) => {
      lens.tx = ev.clientX
      lens.ty = ev.clientY
      lens.tgrip = 1
    }
    const onLeave = () => {
      lens.tgrip = 0
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', resize)
    document.documentElement.addEventListener('pointerleave', onLeave)
    const onVis = () => {
      running = !document.hidden
      if (running && !raf) raf = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={canvasRef} className="hu-lens-canvas" aria-hidden="true" />
}
