// Self-check for the transit photometry.
import assert from 'node:assert/strict'
import {
  limbIntensity, totalFlux, occultedFlux, relativeFlux,
  geometricDepth, durationFraction, separation,
} from './transit.js'

const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`)

// Limb darkening: brightest at disk centre, dimmest at the limb.
close(limbIntensity(1, 0.4, 0.26), 1, 1e-12, 'centre is the reference intensity')
assert.ok(limbIntensity(0, 0.4, 0.26) < limbIntensity(1, 0.4, 0.26), 'limb is darker than centre')
close(limbIntensity(0, 0.4, 0.26), 1 - 0.4 - 0.26, 1e-12, 'limb value follows the quadratic law')
// With no darkening the disk is uniform.
for (const mu of [0, 0.3, 0.7, 1]) close(limbIntensity(mu, 0, 0), 1, 1e-12, 'uniform disk')

// Total flux of a uniform unit disk must be pi.
close(totalFlux(0, 0), Math.PI, 1e-12, 'uniform disk flux = pi')
assert.ok(totalFlux(0.4, 0.26) < Math.PI, 'limb darkening removes flux')

// No overlap means no dip, at any separation beyond 1+k.
for (const d of [1.2, 2, 5]) close(relativeFlux(d, 0.1, 0.4, 0.26), 1, 1e-12, `no transit at d=${d}`)

// A uniform-disk central transit must give exactly the area ratio.
for (const k of [0.05, 0.1, 0.2]) {
  const f = relativeFlux(0, k, 0, 0, 400)
  close(1 - f, geometricDepth(k), 2e-4, `uniform depth = k^2 for k=${k}`)
}

// Limb darkening deepens a central transit: the planet hides the bright middle.
const k = 0.12
const dark = 1 - relativeFlux(0, k, 0.4, 0.26, 300)
assert.ok(dark > geometricDepth(k), `limb darkening deepens the dip (${dark} vs ${geometricDepth(k)})`)

// The curve must be monotonic from centre out to egress: deeper nearer the middle.
let prev = 0
for (const d of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
  const depth = 1 - relativeFlux(d, k, 0.4, 0.26, 120)
  if (d > 0) assert.ok(depth <= prev + 1e-6, `depth decreases outward (d=${d})`)
  prev = depth
}

// A grazing transit must be shallower than a central one.
const central = 1 - relativeFlux(0, k, 0.4, 0.26, 200)
const grazing = 1 - relativeFlux(0.95, k, 0.4, 0.26, 200)
assert.ok(grazing < central, 'grazing transits are shallower')

// Flux never leaves physical bounds.
for (let i = 0; i <= 40; i++) {
  const f = relativeFlux((i / 40) * 1.4, 0.2, 0.5, 0.2, 60)
  assert.ok(f > 0 && f <= 1.0000001, `flux stays in (0,1] (got ${f})`)
}

// Geometry: mid-transit is the closest approach, and a bigger orbit transits
// for a smaller fraction of its period.
close(separation(0, 12, 0.3).d, 0.3, 1e-9, 'phase 0 is mid-transit at the impact parameter')
assert.ok(durationFraction(12, 0, 0.1) > durationFraction(40, 0, 0.1),
  'a wider orbit spends less of its period in transit')
assert.ok(durationFraction(12, 0, 0.1) > durationFraction(12, 0.9, 0.1),
  'a grazing transit is shorter than a central one')

console.log('Transit photometry: all assertions passed (limb darkening, depth, duration, bounds)')
