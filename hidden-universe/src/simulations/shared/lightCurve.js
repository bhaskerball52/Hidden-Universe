// Light-curve plotting for the photometry scenes: canvas sizing, the draw
// call, and seeded photometric noise. Kept apart from StellarScene.jsx so that
// file exports only components.
import { useEffect, useRef } from 'react'

// Keeps the curve canvas at device resolution. Returns a ref to its 2D context
// and CSS size, read by the draw call each frame.
export function useCurveCanvas() {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return undefined
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.max(1, Math.round(cv.clientWidth * dpr))
      cv.height = Math.max(1, Math.round(cv.clientHeight * dpr))
      const ctx = cv.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctxRef.current = { ctx, W: cv.clientWidth, H: cv.clientHeight }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [])
  return { canvasRef, ctxRef }
}

// Draws a model curve, binned "observed" samples and a cursor.
//   model:   Float32Array of flux values evenly spaced across the x range
//   bins:    Float32Array of observed flux (NaN where not yet sampled)
//   cursor:  { x in [0,1], flux }
//   yMin/yMax: flux range; ticks: [{ x in [0,1], label }]
export function drawCurve(c, { model, bins, cursor, yMin, yMax, color, ticks = [], yFormat }) {
  if (!c) return
  const { ctx, W, H } = c
  const L = 52, R = 14, T = 10, B = 22
  const px = (x) => L + x * (W - L - R)
  const py = (f) => T + (1 - (f - yMin) / (yMax - yMin)) * (H - T - B)
  ctx.clearRect(0, 0, W, H)

  ctx.font = '10.5px ui-sans-serif, system-ui, sans-serif'
  ctx.lineWidth = 1
  // Horizontal gridlines at the top, middle and floor of the range.
  for (const f of [yMax, (yMax + yMin) / 2, yMin]) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.moveTo(L, py(f)); ctx.lineTo(W - R, py(f)); ctx.stroke()
    ctx.fillStyle = 'rgba(230,239,255,0.5)'
    ctx.fillText(yFormat(f), 4, py(f) + 3.5)
  }
  for (const t of ticks) {
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'
    ctx.setLineDash([3, 4])
    ctx.beginPath(); ctx.moveTo(px(t.x), T); ctx.lineTo(px(t.x), H - B); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(230,239,255,0.55)'
    const w = ctx.measureText(t.label).width
    ctx.fillText(t.label, Math.min(W - R - w, Math.max(L, px(t.x) - w / 2)), H - 6)
  }

  // Observed samples first, so the model line sits on top of the scatter.
  ctx.fillStyle = 'rgba(226,236,255,0.62)'
  const n = bins.length
  for (let i = 0; i < n; i++) {
    const f = bins[i]
    if (Number.isNaN(f)) continue
    ctx.fillRect(px((i + 0.5) / n) - 1.1, py(f) - 1.1, 2.2, 2.2)
  }

  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  const m = model.length
  for (let i = 0; i < m; i++) {
    const x = px(i / (m - 1)), y = py(model[i])
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()

  if (cursor && cursor.x >= 0 && cursor.x <= 1) {
    const x = px(cursor.x), y = py(cursor.flux)
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.stroke()
    ctx.fillStyle = color
    ctx.globalAlpha = 0.3
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill()
  }
}

// Gaussian photometric noise from a seeded stream, so the scatter is the same
// on every visit rather than flickering differently per load.
export function makeNoise(seed = 7) {
  let s = seed >>> 0
  const u = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u())
}
