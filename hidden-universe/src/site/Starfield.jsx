import { useEffect, useRef } from 'react'

// A 2D-canvas starfield for the hero. Deliberately not WebGL: the homepage
// should stay cheap so the GPU is free the moment a simulation is launched.
//
// Two modes share one particle set. Normally the stars drift on three parallax
// layers and twinkle. When `burstAt` is set, every particle instead flies out
// from the centre to that same resting position, so the explosion resolves
// into exactly the field the page would have shown anyway.

// speed is px per frame; at 60fps 0.12 is ~7 px/s. The previous values
// (0.006-0.026) worked out to 4-16 px in ten seconds, which reads as a still
// image. `depth` drives scroll parallax: nearer layers lag further behind.
const LAYERS = [
  { count: 130, speed: 0.22, size: [0.4, 0.9], alpha: [0.25, 0.5], depth: 0.16 },
  { count: 70, speed: 0.45, size: [0.7, 1.5], alpha: [0.4, 0.75], depth: 0.36 },
  { count: 26, speed: 0.8, size: [1.2, 2.3], alpha: [0.65, 1], depth: 0.62 },
]

const TINTS = ['#ffffff', '#dfe6ff', '#ffe4ec', '#d8f4ff', '#fff3d6']
const DUST_TINTS = ['#ff4d6d', '#c084fc', '#5fd0ff', '#ff8fab', '#7a5aff']

const DUST_COUNT = 46
const SPREAD_MS = 240 // stagger between the first and last particle leaving
const FLASH_MS = 560
const SHOCK_MS = 1400
export const BURST_MS = 1900 // longest a particle can take to settle

const rand = (a, b) => a + Math.random() * (b - a)
const easeOutQuint = (t) => 1 - (1 - t) ** 5

export default function Starfield({ className = '', burstAt = null }) {
  const canvasRef = useRef(null)
  const burstRef = useRef(burstAt)

  // Kept in a ref so changing it never re-runs the effect and re-seeds the field.
  useEffect(() => {
    burstRef.current = burstAt
  }, [burstAt])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let stars = []
    let dust = []
    let w = 0
    let h = 0
    let raf = 0
    let visible = true

    const seed = () => {
      stars = []
      dust = []
      const density = Math.min(1.6, (w * h) / (1440 * 800))
      for (const layer of LAYERS) {
        const n = Math.round(layer.count * density)
        for (let i = 0; i < n; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            tx: 0,
            ty: 0,
            px: 0,
            py: 0,
            r: rand(layer.size[0], layer.size[1]),
            a: rand(layer.alpha[0], layer.alpha[1]),
            vx: layer.speed * rand(0.6, 1.4),
            vy: layer.speed * rand(-0.3, 0.3),
            depth: layer.depth * rand(0.75, 1.25),
            phase: Math.random() * Math.PI * 2,
            twinkle: rand(0.0006, 0.0022),
            tint: TINTS[(Math.random() * TINTS.length) | 0],
            delay: Math.random() * SPREAD_MS,
            dur: rand(1050, BURST_MS - SPREAD_MS),
          })
        }
      }
      for (let i = 0; i < Math.round(DUST_COUNT * density); i++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(14, 52),
          a: rand(0.05, 0.14),
          tint: DUST_TINTS[(Math.random() * DUST_TINTS.length) | 0],
          delay: Math.random() * SPREAD_MS,
          dur: rand(1250, BURST_MS - SPREAD_MS),
          drift: rand(0.16, 0.42),
          depth: rand(0.08, 0.2),
        })
      }
      // Resting positions are wherever the drift would have put them.
      for (const s of stars) {
        s.tx = s.x
        s.ty = s.y
        s.px = s.x
        s.py = s.y
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)
      // Cross-fade with the sitewide LensField, which fades in over the same
      // stretch of scroll. Together they hand the background over smoothly
      // instead of one section cutting to the next.
      const vh = window.innerHeight || 1
      const sy = Math.max(0, window.scrollY)
      const scrollFade = Math.max(0, 1 - sy / (vh * 0.75))
      if (scrollFade <= 0.004) return
      const cx = w / 2
      const cy = h / 2
      const burst = burstRef.current
      const since = burst == null ? Infinity : t - burst
      const bursting = since >= 0 && since < BURST_MS + 200
      const preBang = burst != null && since < 0

      // Before the bang there is nothing but a seed of light at the centre.
      if (preBang) {
        const seedGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26)
        seedGlow.addColorStop(0, 'rgba(255,255,255,0.5)')
        seedGlow.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = seedGlow
        ctx.beginPath()
        ctx.arc(cx, cy, 26, 0, Math.PI * 2)
        ctx.fill()
        return
      }

      // --- dust, behind the stars -----------------------------------------
      for (const d of dust) {
        let x = d.x
        let y = d.y
        let k = 1
        if (bursting) {
          const p = Math.min(1, Math.max(0, (since - d.delay) / d.dur))
          k = easeOutQuint(p)
          x = cx + (d.x - cx) * k
          y = cy + (d.y - cy) * k
        } else if (!reduced) {
          d.x += d.drift
          if (d.x > w + d.r) d.x = -d.r
          x = d.x
          y = d.y + sy * d.depth
        }
        if (k <= 0.02) continue
        const g = ctx.createRadialGradient(x, y, 0, x, y, d.r)
        g.addColorStop(0, d.tint)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.globalAlpha = d.a * k * scrollFade
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // --- stars ------------------------------------------------------------
      for (const s of stars) {
        let x
        let y
        let scale = 1
        let alpha = s.a

        if (bursting) {
          const p = Math.min(1, Math.max(0, (since - s.delay) / s.dur))
          const k = easeOutQuint(p)
          x = cx + (s.tx - cx) * k
          y = cy + (s.ty - cy) * k
          scale = 0.35 + 0.65 * k
          alpha = s.a * Math.min(1, p * 4)
          // Motion streak while it is still moving fast, this is what sells
          // the explosion; a dot moving between frames just reads as a jump.
          const dx = x - s.px
          const dy = y - s.py
          const d2 = dx * dx + dy * dy
          if (d2 > 4) {
            ctx.globalAlpha = Math.min(0.7, alpha * 0.85) * scrollFade
            ctx.strokeStyle = s.tint
            ctx.lineWidth = Math.max(0.5, s.r * scale * 0.9)
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(s.px, s.py)
            ctx.lineTo(x, y)
            ctx.stroke()
          }
          s.px = x
          s.py = y
          // Keep the drift field in sync so there is no jump when it hands over.
          s.x = x
          s.y = y
        } else {
          if (!reduced) {
            s.x += s.vx
            s.y += s.vy
            if (s.x > w + 2) s.x = -2
            if (s.x < -2) s.x = w + 2
            if (s.y > h + 2) s.y = -2
            if (s.y < -2) s.y = h + 2
          }
          x = s.x
          // Parallax: each layer lags the scroll by its own depth, so the field
          // visibly separates as the hero leaves rather than moving as one sheet.
          y = s.y + sy * s.depth
          const flicker = reduced ? 1 : 0.72 + 0.28 * Math.sin(t * s.twinkle + s.phase)
          alpha = s.a * flicker
        }

        ctx.globalAlpha = Math.min(1, alpha) * scrollFade
        ctx.fillStyle = s.tint
        ctx.beginPath()
        ctx.arc(x, y, Math.max(0.25, s.r * scale), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (!bursting) return

      // --- shockwave ---------------------------------------------------------
      if (since < SHOCK_MS) {
        const p = since / SHOCK_MS
        const k = easeOutQuint(p)
        const maxR = Math.hypot(w, h) * 0.62
        ctx.globalAlpha = (1 - p) * 0.32
        ctx.strokeStyle = '#ffd6e6'
        ctx.lineWidth = Math.max(0.4, 5 * (1 - p))
        ctx.beginPath()
        ctx.arc(cx, cy, k * maxR, 0, Math.PI * 2)
        ctx.stroke()

        ctx.globalAlpha = (1 - p) * 0.18
        ctx.strokeStyle = '#9fd8ff'
        ctx.lineWidth = Math.max(0.3, 3 * (1 - p))
        ctx.beginPath()
        ctx.arc(cx, cy, k * maxR * 0.86, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // --- central flash -----------------------------------------------------
      if (since < FLASH_MS) {
        const p = since / FLASH_MS
        const fade = (1 - p) ** 2
        const rad = Math.min(w, h) * (0.16 + p * 0.9)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`)
        g.addColorStop(0.22, `rgba(255,192,214,${0.55 * fade})`)
        g.addColorStop(0.55, `rgba(168,132,255,${0.22 * fade})`)
        g.addColorStop(1, 'rgba(120,180,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = (t) => {
      draw(t)
      raf = visible ? requestAnimationFrame(loop) : 0
    }

    resize()
    // Always run the loop: even with reduced motion the burst hand-off and the
    // initial paint need at least one frame, and `draw` skips the motion itself.
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Stop burning frames when the hero scrolls out of view or the tab hides.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible && !raf) raf = requestAnimationFrame(loop)
      },
      { threshold: 0 }
    )
    io.observe(canvas)

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else if (visible && !raf) {
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className={`hu-starfield ${className}`} aria-hidden="true" />
}
