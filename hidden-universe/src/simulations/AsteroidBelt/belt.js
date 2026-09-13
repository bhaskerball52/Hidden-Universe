// Belt dynamics. No React or three.js, so it is unit-testable:
// see AsteroidBelt.check.mjs.
//
// Units: AU, and years scaled so a 1 AU circular orbit takes 1 year. Jupiter
// sits at 5.203 AU, so its period is 5.203^1.5 = 11.86 yr, which is correct.

export const JUPITER_A = 5.203
export const BELT_INNER = 2.0
export const BELT_OUTER = 3.6

export const periodOf = (a) => Math.pow(a, 1.5)

// Semi-major axis at which an asteroid's period is p/q of Jupiter's.
// A 3:1 resonance means the asteroid goes round three times per Jupiter orbit.
export const resonanceAxis = (p, q) => JUPITER_A * Math.pow(q / p, 2 / 3)

// The resonances that actually carve the belt, strongest first.
export const RESONANCES = [
  { p: 3, q: 1, label: '3:1', strength: 1.0 },
  { p: 5, q: 2, label: '5:2', strength: 0.8 },
  { p: 7, q: 3, label: '7:3', strength: 0.45 },
  { p: 2, q: 1, label: '2:1', strength: 0.95 },
  { p: 4, q: 1, label: '4:1', strength: 0.4 },
].map((r) => ({ ...r, a: resonanceAxis(r.p, r.q) }))

// How hard a given semi-major axis is being pumped. Each resonance acts over a
// narrow band; outside it the eccentricity only oscillates and never grows, so
// the profile is cut off rather than left with Gaussian tails that would slowly
// empty the whole belt. Widths are in AU and scale with strength, which is why
// 3:1 and 2:1 clear wide gaps and 7:3 only a notch.
const CUTOFF = 0.25
export function resonanceForcing(a, jupiterMass = 1) {
  let f = 0
  for (const r of RESONANCES) {
    const width = 0.016 + 0.03 * r.strength
    const d = (a - r.a) / width
    f += r.strength * Math.max(0, Math.exp(-d * d) - CUTOFF) / (1 - CUTOFF)
  }
  return f * jupiterMass
}

// Eccentricity growth inside a resonance, dt in years. The rate is set so the
// centre of the 3:1 gap is driven onto a Mars-crossing orbit in roughly a
// million years, the timescale found in numerical integrations.
export const PUMP_PER_YEAR = 6.5e-7
export const pumpEccentricity = (e, a, dt, jupiterMass) =>
  Math.min(1, e + resonanceForcing(a, jupiterMass) * dt * PUMP_PER_YEAR)

// An asteroid is removed once its perihelion drops inside Mars's orbit, because
// that is what actually empties the gaps: a close encounter throws it out.
export const MARS_A = 1.524
export const isCleared = (a, e) => a * (1 - e) < MARS_A

// Position on its orbit at time t. Circular-plus-eccentric approximation is
// enough here: with ten thousand bodies the belt's shape is what matters, and
// solving Kepler per asteroid per frame would cost far more than it shows.
export function positionOf(a, e, phase, t) {
  const n = (2 * Math.PI) / periodOf(a)
  const M = phase + n * t
  // First-order expansion of the equation of centre, good to O(e^2).
  const nu = M + 2 * e * Math.sin(M)
  const r = a * (1 - e * e) / (1 + e * Math.cos(nu))
  return { x: r * Math.cos(nu), y: r * Math.sin(nu), r }
}

// Jupiter's Trojans sit 60 degrees ahead of and behind it, at L4 and L5.
export const TROJAN_LEAD = Math.PI / 3

// Deterministic PRNG (mulberry32). Seeding the belt rather than calling
// Math.random keeps component initialisation pure, and has the side benefit
// that the belt looks identical on every load, so screenshots are comparable.
export function rng(seed = 0x9e3779b9) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
