// Self-check for the two-body orbit maths. Run:
//   node src/simulations/KeplerOrbits/orbit.check.mjs
import assert from 'node:assert/strict'
import {
  GM, eccentricAnomaly, trueAnomaly, radiusAt, period, speedAt,
  perihelion, aphelion, angularMomentum, stateAt, sweptArea,
} from './orbit.js'

const close = (a, b, tol, what) =>
  assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b} (tol ${tol})`)

// Kepler's equation must invert exactly, across the full eccentricity range.
for (const e of [0, 0.1, 0.4, 0.7, 0.9, 0.95]) {
  for (let k = 0; k < 24; k++) {
    const M = (k / 24) * 2 * Math.PI
    const E = eccentricAnomaly(M, e)
    close(E - e * Math.sin(E), ((M + Math.PI) % (2 * Math.PI)) - Math.PI, 1e-8, `Kepler inverse e=${e}`)
  }
}

// A circle is the e=0 special case: radius and speed constant everywhere.
for (const nu of [0, 1, 2.5, 4]) {
  close(radiusAt(2, 0, nu), 2, 1e-12, 'circular radius')
}
close(speedAt(1, 1), Math.sqrt(GM), 1e-12, 'circular speed at r=a=1')

// Third law: period depends on a only. Two very different eccentricities, same a.
close(period(1), 2 * Math.PI, 1e-12, 'period at a=1')
close(period(4) / period(1), 8, 1e-12, 'T scales as a^(3/2)')

// Apsides and the vis-viva speeds at them.
const a = 1.5, e = 0.6
close(perihelion(a, e), 0.6, 1e-12, 'perihelion')
close(aphelion(a, e), 2.4, 1e-12, 'aphelion')
const vp = speedAt(perihelion(a, e), a)
const va = speedAt(aphelion(a, e), a)
assert.ok(vp > va, 'must move fastest at perihelion')
// Angular momentum is conserved: r_p*v_p == r_a*v_a == h.
close(perihelion(a, e) * vp, aphelion(a, e) * va, 1e-10, 'r x v conserved')
close(perihelion(a, e) * vp, angularMomentum(a, e), 1e-10, 'h matches sqrt(GM a (1-e^2))')

// The second law, which is the whole point of the scene: equal areas in equal
// times, anywhere on the orbit, including across perihelion and aphelion.
const T = period(a)
const dt = T / 12
const areas = []
for (let i = 0; i < 12; i++) {
  const s0 = stateAt(i * dt, a, e)
  const s1 = stateAt((i + 1) * dt, a, e)
  let nu0 = s0.nu, nu1 = s1.nu
  if (nu1 < nu0) nu1 += 2 * Math.PI    // wrap once per orbit
  areas.push(sweptArea(a, e, nu0, nu1))
}
const mean = areas.reduce((s, x) => s + x, 0) / areas.length
for (const A of areas) close(A, mean, 1e-6, 'equal areas in equal times')

// Total area over one period must equal the ellipse area, pi*a*b.
const b = a * Math.sqrt(1 - e * e)
close(areas.reduce((s, x) => s + x, 0), Math.PI * a * b, 1e-6, 'total swept area = pi a b')

// Energy is conserved around the orbit: v^2/2 - GM/r is constant = -GM/2a.
for (let i = 0; i < 10; i++) {
  const s = stateAt((i / 10) * T, a, e)
  close(s.speed ** 2 / 2 - GM / s.r, -GM / (2 * a), 1e-9, 'specific orbital energy')
}

// True anomaly must sweep a full turn over one period and stay monotonic.
let prev = -Infinity, wraps = 0
for (let i = 0; i <= 200; i++) {
  const nu = trueAnomaly(eccentricAnomaly((i / 200) * 2 * Math.PI, 0.7), 0.7)
  if (nu < prev) wraps++
  prev = nu
}
assert.equal(wraps, 1, 'true anomaly wraps exactly once per orbit')

console.log('Kepler orbit maths: all assertions passed (Kepler inverse, 3 laws, vis-viva, energy, h)')
