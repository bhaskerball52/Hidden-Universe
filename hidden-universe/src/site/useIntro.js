import { useCallback, useEffect, useRef, useState } from 'react'

// Opening sequence timing, in ms from mount.
export const INTRO = {
  bang: 1000, // title has bloomed; everything detonates
  total: 3000, // scroll unlocks
}

// Module-level, deliberately NOT sessionStorage: this resets on every page load
// but survives React remounts. So the sequence plays each time the site is
// loaded (which is the point of it), yet returning from a simulation, which
// only remounts Home, does not replay it.
let hasPlayed = false

export function shouldRunIntro() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return !hasPlayed
}

// Drives the opening: locks the page, tells the starfield when to detonate, and
// unlocks on finish or on any attempt to interact.
export function useIntro() {
  // Both are fixed at first render. performance.now() is the clock
  // requestAnimationFrame reports in, so the canvas burst lines up with the CSS
  // keyframes, which start at this element's first paint, instead of drifting.
  const [initial] = useState(() => {
    const run = shouldRunIntro()
    return { run, burstAt: run ? performance.now() + INTRO.bang : null }
  })
  const [running, setRunning] = useState(initial.run)
  const timers = useRef([])

  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    hasPlayed = true
    setRunning(false)
  }, [])

  useEffect(() => {
    if (!running) {
      document.body.removeAttribute('data-intro')
      return undefined
    }

    document.body.dataset.intro = 'running'
    timers.current.push(setTimeout(finish, INTRO.total))

    // Only an explicit Escape skips. Wheel/pointer/touch deliberately do NOT:
    // the page is meant to hold for the full three seconds, and a stray
    // trackpad nudge during load would otherwise kill the sequence outright.
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, finish])

  // Leaving the hub mid-sequence must not leave the page locked.
  useEffect(() => {
    const cells = timers.current
    return () => {
      cells.forEach(clearTimeout)
      document.body.removeAttribute('data-intro')
    }
  }, [])

  return { running, burstAt: initial.burstAt, skip: finish }
}
