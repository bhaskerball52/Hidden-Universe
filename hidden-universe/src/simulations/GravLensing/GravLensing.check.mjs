import assert from 'node:assert/strict'
import { images, magnification, totalMagnification, einsteinRadius, sourceOf, sourcePos } from './lens.js'
const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`)

// Perfect alignment gives the Einstein ring: both images at theta = 1.
const ring = images(0)
close(ring.plus, 1, 1e-12, 'aligned source images at +1')
close(ring.minus, -1, 1e-12, 'aligned source images at -1')

// The images always straddle the ring: one outside, one inside, opposite sides.
for (const beta of [0.01, 0.2, 1, 3, 10]) {
  const { plus, minus } = images(beta)
  assert.ok(plus > 1, `outer image outside the ring at beta=${beta}`)
  assert.ok(minus > -1 && minus < 0, `inner image inside the ring, opposite side, at beta=${beta}`)
  // Exact identities of the point-mass lens.
  close(plus * minus, -1, 1e-10, `theta+ * theta- = -1 at beta=${beta}`)
  close(plus + minus, beta, 1e-10, `theta+ + theta- = beta at beta=${beta}`)
  // Each image must map back to the source it came from.
  close(sourceOf(plus), beta, 1e-10, `outer image maps back to the source`)
  close(sourceOf(minus), beta, 1e-10, `inner image maps back to the source`)
}

// Magnification: outer image always brighter than unlensed, inner always fainter
// far away, and the total is the sum of absolute values.
for (const beta of [0.1, 0.5, 1, 2, 5]) {
  const { plus, minus } = images(beta)
  const mu = Math.abs(magnification(plus)) + Math.abs(magnification(minus))
  close(mu, totalMagnification(beta), 1e-8, `total magnification at beta=${beta}`)
  assert.ok(Math.abs(magnification(plus)) > 1, 'outer image is magnified')
}

// Far from the lens nothing happens: magnification goes to 1, the outer image
// goes to the source position, the inner one vanishes.
close(totalMagnification(50), 1, 1e-3, 'no magnification far away')
close(images(50).plus, 50, 0.05, 'outer image approaches the true position')
assert.ok(Math.abs(magnification(images(50).minus)) < 1e-4, 'inner image vanishes far away')

// Magnification must rise without bound as the alignment closes.
let prev = 0
for (const beta of [2, 1, 0.5, 0.2, 0.05, 0.01]) {
  const mu = totalMagnification(beta)
  assert.ok(mu > prev, `magnification rises as alignment improves (beta=${beta})`)
  prev = mu
}
assert.ok(totalMagnification(0.001) > 500, 'near-perfect alignment is hugely magnified')

// A source exactly on the ring radius is magnified by the classic 1.34.
close(totalMagnification(1), 3 / Math.sqrt(5), 1e-9, 'beta=1 gives 3/sqrt(5) = 1.34')

// Einstein radius for a solar mass lens halfway to a source 8 kpc away.
const kpc = 3.086e19
const thetaE = einsteinRadius(1.989e30, 4 * kpc, 8 * kpc)
const mas = thetaE * (180 / Math.PI) * 3.6e6
assert.ok(mas > 0.5 && mas < 2, `solar-mass microlensing is ~1 mas (got ${mas.toFixed(2)})`)

// The 2D mapping must agree with the 1D one along an axis, and be radial.
for (const r of [0.5, 1.5, 4]) {
  const s = sourcePos(r, 0)
  close(s.x, sourceOf(r), 1e-10, `2D matches 1D at r=${r}`)
  close(s.y, 0, 1e-12, 'deflection stays radial')
}

console.log('Gravitational lensing: all assertions passed (ring, image pairs, magnification, Einstein radius)')
