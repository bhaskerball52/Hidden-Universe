// Self-check for the belt dynamics. Run:
//   node src/simulations/AsteroidBelt/AsteroidBelt.check.mjs
import assert from 'node:assert/strict'
import {
  JUPITER_A, periodOf, resonanceAxis, RESONANCES, resonanceForcing,
  pumpEccentricity, isCleared, positionOf, MARS_A,
} from './belt.js'

const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`)

// Kepler's third law in the units the scene uses.
close(periodOf(1), 1, 1e-12, 'a=1 gives a 1 year period')
close(periodOf(JUPITER_A), 11.86, 0.02, "Jupiter's period is 11.86 yr")

// The resonance positions must land where the real Kirkwood gaps are observed.
// These are measured values, not outputs of this code.
const byLabel = Object.fromEntries(RESONANCES.map((r) => [r.label, r.a]))
close(byLabel['3:1'], 2.50, 0.02, '3:1 gap near 2.50 AU')
close(byLabel['5:2'], 2.82, 0.02, '5:2 gap near 2.82 AU')
close(byLabel['7:3'], 2.96, 0.03, '7:3 gap near 2.96 AU')
close(byLabel['2:1'], 3.28, 0.02, '2:1 gap near 3.28 AU')

// A resonance means an integer period ratio, by definition.
for (const r of RESONANCES) {
  close(periodOf(JUPITER_A) / periodOf(r.a), r.p / r.q, 1e-9, `${r.label} period ratio`)
}

// Forcing must peak at the resonance and fall away fast, or the whole belt
// would empty instead of forming gaps.
for (const r of RESONANCES) {
  const atGap = resonanceForcing(r.a)
  const away = resonanceForcing(r.a + 0.25)
  assert.ok(atGap > away * 3, `${r.label}: forcing must be localised (${atGap} vs ${away})`)
}
// A quiet part of the belt should be barely forced at all.
assert.ok(resonanceForcing(2.65) < 0.25, 'the belt between gaps stays populated')

// Eccentricity pumping must clear a resonant orbit and spare a non-resonant one.
// dt is in years; 400 steps of 2,500 yr is one million years.
const run = (a, steps = 400) => {
  let e = 0.05
  for (let i = 0; i < steps; i++) e = pumpEccentricity(e, a, 2500, 1)
  return { e, cleared: isCleared(a, e) }
}
const atRes = run(byLabel['3:1'])
const between = run(2.65)
assert.ok(atRes.cleared, `3:1 must clear (e reached ${atRes.e.toFixed(3)})`)
assert.ok(!between.cleared, `2.65 AU must survive (e reached ${between.e.toFixed(3)})`)
// The gaps are notches, not canyons: 0.1 AU off the 3:1 survives four million years.
assert.ok(!run(byLabel['3:1'] + 0.1, 1600).cleared, 'the 3:1 gap stays narrow')
// And the 3:1 centre takes of order a million years, not a few thousand.
assert.ok(!run(byLabel['3:1'], 40).cleared, '3:1 does not clear in 100 kyr')

// Clearing criterion: perihelion crossing Mars.
assert.ok(isCleared(2.5, 0.45), 'high e at 2.5 AU crosses Mars')
assert.ok(!isCleared(2.5, 0.1), 'low e at 2.5 AU does not')
close(2.5 * (1 - 0.3904), MARS_A, 0.01, 'clearing threshold is the Mars crossing')

// Orbits must stay bounded between perihelion and aphelion.
for (const e of [0, 0.1, 0.3]) {
  for (let k = 0; k < 40; k++) {
    const pos = positionOf(2.7, e, 0, k * 0.7)
    assert.ok(pos.r > 2.7 * (1 - e) - 0.02 && pos.r < 2.7 * (1 + e) + 0.02,
      `radius stays within the apsides (e=${e}, r=${pos.r})`)
  }
}

// Inner belt orbits faster than outer, which is what shears the belt.
const inner = positionOf(2.1, 0, 0, 1)
const outer = positionOf(3.3, 0, 0, 1)
assert.ok(Math.atan2(inner.y, inner.x) > Math.atan2(outer.y, outer.x),
  'inner asteroids lead outer ones')

console.log(`Asteroid belt dynamics: all assertions passed ` +
  `(gaps at ${RESONANCES.map((r) => r.a.toFixed(2)).join(', ')} AU)`)

// The PRNG must be deterministic and well distributed, since the belt's whole
// initial state comes from it.
import { rng } from './belt.js'
const r1 = rng(123), r2 = rng(123)
for (let i = 0; i < 50; i++) assert.equal(r1(), r2(), 'same seed gives the same stream')
assert.notEqual(rng(1)(), rng(2)(), 'different seeds differ')
const r3 = rng(7)
let sum = 0, lo = 1, hi = 0
for (let i = 0; i < 20000; i++) { const v = r3(); sum += v; lo = Math.min(lo, v); hi = Math.max(hi, v) }
assert.ok(Math.abs(sum / 20000 - 0.5) < 0.02, 'mean near 0.5')
assert.ok(lo >= 0 && hi < 1, 'stays in [0,1)')
console.log('PRNG: deterministic and uniform')
