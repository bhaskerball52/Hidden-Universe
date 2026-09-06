import { useEffect, useRef } from 'react'
import './HandGestureControl.css'

// ── Gesture-tuning constants (verbatim from the reference HTML demo) ─────────
const MIN_GESTURE_SCALE   = 0.1
const MAX_GESTURE_SCALE   = 2.4
const PALM_SIZE_MIN       = 0.11
const PALM_SIZE_MAX       = 0.28
const PALM_SIZE_SCALE_ONE = 0.1547368421

const mapLinear = (v, a1, a2, b1, b2) => b1 + ((b2 - b1) * (v - a1)) / (a2 - a1)
const clamp     = (v, a, b) => Math.max(a, Math.min(b, v))

// ── Shared per-frame smoothing with angular momentum ────────────────────────
// Advances a gesture state object (curRotX/Y/Scale + velRotX/Y) one frame.
//   • enabled & hand present → low-pass toward the hand targets while tracking
//     the resulting angular velocity (an EMA, so it reflects recent motion).
//   • enabled & hand gone    → conserve momentum: keep spinning on the last
//     angular velocity, decaying smoothly by `friction` each frame until it
//     coasts to rest (zoom is held, matching the prior behaviour).
//   • disabled               → ease rotation/scale back to the identity pose.
// Consumers call this, then read g.curRotX / g.curRotY / g.curScale.
export function advanceGesture(g, enabled, opts = {}) {
  if (!g) return
  const { rotLerp = 0.05, scaleLerp = 0.12, friction = 0.95, velBlend = 0.3 } = opts
  if (enabled && g.handPresent) {
    const px = g.curRotX, py = g.curRotY
    g.curRotX  += (g.targetRotX  - g.curRotX)  * rotLerp
    g.curRotY  += (g.targetRotY  - g.curRotY)  * rotLerp
    g.curScale += (g.targetScale - g.curScale) * scaleLerp
    g.velRotX = g.velRotX * (1 - velBlend) + (g.curRotX - px) * velBlend
    g.velRotY = g.velRotY * (1 - velBlend) + (g.curRotY - py) * velBlend
  } else if (enabled) {
    g.curRotX += g.velRotX
    g.curRotY += g.velRotY
    g.velRotX *= friction
    g.velRotY *= friction
    if (Math.abs(g.velRotX) < 1e-5) g.velRotX = 0
    if (Math.abs(g.velRotY) < 1e-5) g.velRotY = 0
  } else {
    g.curRotX  += (0 - g.curRotX)  * rotLerp
    g.curRotY  += (0 - g.curRotY)  * rotLerp
    g.curScale += (1 - g.curScale) * scaleLerp
    g.velRotX = 0
    g.velRotY = 0
  }
}

// Piecewise palm-size → scale mapping: small palm collapses toward MIN, large
// palm expands toward MAX, with palm = PALM_SIZE_SCALE_ONE pinned at 1.0.
function mapPalmSizeToScale(palmSize) {
  if (palmSize <= PALM_SIZE_SCALE_ONE) {
    return mapLinear(palmSize, PALM_SIZE_MIN, PALM_SIZE_SCALE_ONE, MIN_GESTURE_SCALE, 1.0)
  }
  return mapLinear(palmSize, PALM_SIZE_SCALE_ONE, PALM_SIZE_MAX, 1.0, MAX_GESTURE_SCALE)
}

// Lazily inject a CDN script once per URL.
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-mp="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve()
      existing.addEventListener('load',  () => resolve())
      existing.addEventListener('error', (e) => reject(e))
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.crossOrigin = 'anonymous'
    s.async = true
    s.dataset.mp = src
    s.onload  = () => { s.dataset.loaded = '1'; resolve() }
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
}

/**
 * Hand-gesture control for the galaxy.
 *  - Open hand: hand position rotates the galaxy.
 *  - Closed fist: palm size (= hand distance from camera) scales the galaxy.
 * Writes target values into `gestureRef.current` which the scene reads each
 * frame and smoothly lerps toward (same approach as the reference demo).
 */
export default function HandGestureControl({ enabled, onToggle, gestureRef }) {
  const videoRef  = useRef(null)
  const statusRef = useRef(null)
  const camRef    = useRef(null)
  const handsRef  = useRef(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const setStatus = (txt) => { if (statusRef.current) statusRef.current.textContent = txt }
    // Start with no coast carried over from a previous session.
    if (gestureRef.current) {
      gestureRef.current.handPresent = false
      gestureRef.current.velRotX = 0
      gestureRef.current.velRotY = 0
    }

    async function setup() {
      setStatus('Loading hand-tracking model…')
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
        if (cancelled) return

        const HandsCls = window.Hands
        const CamCls   = window.Camera
        if (!HandsCls || !CamCls) {
          setStatus('Hand-tracking library failed to load (check your connection).')
          return
        }

        const hands = new HandsCls({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        })
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        hands.onResults((results) => {
          const g = gestureRef.current
          if (!g) return

          if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            // Hand left the frame: don't snap to rest, clearing handPresent lets
            // the scene conserve its angular momentum and coast to a smooth stop.
            // The last fist-set zoom is also held.
            g.handPresent = false
            setStatus(`No hand detected, coasting to a stop (zoom held ${g.targetScale.toFixed(2)}×)`)
            return
          }
          g.handPresent = true
          // (the per-frame status text written below already states the
          //  Fist→zoom / Open-hand→rotate mapping explicitly.)

          // ── Landmarks (MediaPipe Hands indexing) ────────────────────────
          const h = results.multiHandLandmarks[0]
          const wrist      = h[0]
          const thumbTip   = h[4],  thumbIP   = h[3]
          const indexMcp   = h[5],  indexPip  = h[6],  indexTip  = h[8]
          const middleBase = h[9],  middlePip = h[10], middleTip = h[12]
          const ringPip    = h[14], ringTip   = h[16]
          const pinkyMcp   = h[17], pinkyPip  = h[18], pinkyTip  = h[20]

          const palmSize    = Math.hypot(wrist.x - middleBase.x, wrist.y - middleBase.y) || 0.08
          const palmCenterX = (wrist.x + middleBase.x) * 0.5
          const palmCenterY = (wrist.y + middleBase.y) * 0.5

          const fingertipSpread = (
            Math.hypot(thumbTip.x  - palmCenterX, thumbTip.y  - palmCenterY) +
            Math.hypot(indexTip.x  - palmCenterX, indexTip.y  - palmCenterY) +
            Math.hypot(middleTip.x - palmCenterX, middleTip.y - palmCenterY) +
            Math.hypot(ringTip.x   - palmCenterX, ringTip.y   - palmCenterY) +
            Math.hypot(pinkyTip.x  - palmCenterX, pinkyTip.y  - palmCenterY)
          ) / 5
          const openness = fingertipSpread / palmSize

          // ── Per-finger curl test (verbatim from the reference) ──────────
          const thumbCurled =
            Math.hypot(thumbTip.x - palmCenterX, thumbTip.y - palmCenterY) <
            Math.hypot(thumbIP.x  - palmCenterX, thumbIP.y  - palmCenterY) * 1.1
          const indexCurled  = Math.hypot(indexTip.x  - wrist.x, indexTip.y  - wrist.y) <
                               Math.hypot(indexPip.x  - wrist.x, indexPip.y  - wrist.y) * 1.08
          const middleCurled = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) <
                               Math.hypot(middlePip.x - wrist.x, middlePip.y - wrist.y) * 1.08
          const ringCurled   = Math.hypot(ringTip.x   - wrist.x, ringTip.y   - wrist.y) <
                               Math.hypot(ringPip.x   - wrist.x, ringPip.y   - wrist.y) * 1.08
          const pinkyCurled  = Math.hypot(pinkyTip.x  - wrist.x, pinkyTip.y  - wrist.y) <
                               Math.hypot(pinkyPip.x  - wrist.x, pinkyPip.y  - wrist.y) * 1.12
          const curledCount = (indexCurled ? 1 : 0) + (middleCurled ? 1 : 0) +
                              (ringCurled  ? 1 : 0) + (pinkyCurled  ? 1 : 0)
          const isFist = openness < 1.72 && thumbCurled && curledCount >= 3

          // ── Hand position → galaxy rotation ─────────────────────────────
          const handCenterX = (wrist.x + middleBase.x + indexMcp.x + pinkyMcp.x) * 0.25
          const handCenterY = (wrist.y + middleBase.y + indexMcp.y + pinkyMcp.y) * 0.25
          g.targetRotY = -(handCenterX - 0.5) * Math.PI * 1.8
          g.targetRotX =  (handCenterY - 0.5) * Math.PI * 1.1

          // ── Fist + palm size → scale (closer hand = larger). Opening the
          //    hand only rotates, it KEEPS the last fist-set zoom so you can
          //    inspect the scene at a chosen zoom level.
          if (isFist) {
            g.targetScale = clamp(mapPalmSizeToScale(palmSize), MIN_GESTURE_SCALE, MAX_GESTURE_SCALE)
            setStatus(`Fist → zoom ${g.targetScale.toFixed(2)}×  (closer hand = larger)`)
          } else {
            setStatus(`Open hand → rotate  ·  zoom held ${g.targetScale.toFixed(2)}×`)
          }
        })

        const video = videoRef.current
        if (!video) return
        const cam = new CamCls(video, {
          onFrame: async () => { if (handsRef.current) await handsRef.current.send({ image: video }) },
          width: 640, height: 480,
        })
        handsRef.current = hands
        camRef.current   = cam
        await cam.start()
        if (cancelled) { try { cam.stop() } catch { /* noop */ } ; return }
        setStatus('Camera active. Show your hand to control.')
      } catch (err) {
        console.error('[HandGestureControl] setup failed', err)
        if (!cancelled) {
          setStatus('Camera/AI failed to start. Allow camera access on localhost.')
        }
      }
    }
    setup()

    return () => {
      cancelled = true
      try { camRef.current   && camRef.current.stop()   } catch { /* noop */ }
      try { handsRef.current && handsRef.current.close && handsRef.current.close() } catch { /* noop */ }
      camRef.current   = null
      handsRef.current = null
      // gestureRef is a plain object that lives for the component's whole
      // lifetime, so it's safe to read in cleanup despite the generic warning.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const g = gestureRef.current
      if (g) {
        g.targetRotX = 0; g.targetRotY = 0; g.targetScale = 1
        g.handPresent = false; g.velRotX = 0; g.velRotY = 0
      }
    }
  }, [enabled, gestureRef])

  return (
    <>
      <button
        type="button"
        className={`gesture-btn ${enabled ? 'gesture-btn-active' : ''}`}
        onClick={onToggle}
      >
        <span className="gesture-dot" />
        Hand Gestures {enabled ? 'On' : 'Off'}
      </button>
      {enabled && (
        <>
          <video ref={videoRef} className="gesture-video" autoPlay playsInline muted />
          <div className="gesture-status">
            <div className="gesture-hint">Fist → zoom in/out · Open hand → rotate</div>
            <div ref={statusRef} className="gesture-state">Initialising…</div>
          </div>
        </>
      )}
    </>
  )
}
