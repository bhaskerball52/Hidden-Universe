// Self-check for the point-mass lens equation used by LensField.
// Run: node src/site/LensField.check.mjs
import assert from 'node:assert/strict'

const images = (b, e) => {
  const root = Math.sqrt(b * b + 4 * e * e)
  return [(b + root) / 2, (b - root) / 2]
}

const e = 40
for (const b of [0.001, 1, 5, 17, 40, 91, 300]) {
  const [tp, tm] = images(b, e)
  // Exact identity of the point-mass lens: the two images straddle the ring.
  assert.ok(Math.abs(tp * tm + e * e) < 1e-6, `t+·t- = -e² fails at b=${b}`)
  assert.ok(tp > 0 && tm < 0, `images must land on opposite sides at b=${b}`)
  assert.ok(tp >= e && Math.abs(tm) <= e, `t+ outside ring, t- inside, at b=${b}`)
  // Lensing conserves the source: t+ + t- = b
  assert.ok(Math.abs(tp + tm - b) < 1e-9, `t+ + t- = b fails at b=${b}`)
}
// On-axis source closes into the Einstein ring.
const [rp, rm] = images(0, e)
assert.ok(Math.abs(rp - e) < 1e-9 && Math.abs(rm + e) < 1e-9, 'b=0 must give ±e')
// Far from the lens the primary image is essentially undeflected.
const [fp] = images(10000, e)
assert.ok(Math.abs(fp - 10000) < 0.2, 'far field must be ~unlensed')

console.log('LensField lens equation: all assertions passed')

// Magnification law: what actually drives how bright each image is drawn.
const eR = 40, e4 = eR ** 4
const magPlus  = (b) => { const t = (b + Math.sqrt(b * b + 4 * eR * eR)) / 2
  return 1 / Math.max(0.08, 1 - e4 / Math.pow(Math.max(t, 0.001), 4)) }
const magMinus = (b) => { const t = (b - Math.sqrt(b * b + 4 * eR * eR)) / 2
  return 1 / Math.max(0.08, Math.abs(1 - e4 / Math.pow(Math.min(t, -0.001), 4))) }

for (const b of [1, 10, 40, 120, 600, 3000]) {
  assert.ok(magPlus(b) >= 0.99, `µ+ must be >= 1 at b=${b}, got ${magPlus(b)}`)
}
// Far from the lens the primary image is unmagnified and the counter-image dies.
assert.ok(Math.abs(magPlus(3000) - 1) < 0.01, 'µ+ -> 1 far from lens')
assert.ok(magMinus(3000) < 0.01, `|µ-| must vanish far from lens, got ${magMinus(3000)}`)
assert.ok(magMinus(600) < magMinus(120), '|µ-| must fall off with distance')
assert.ok(magMinus(120) < magMinus(10), '|µ-| must fall off with distance')
// At the ring both images are strongly magnified.
assert.ok(magPlus(0.01) > 5 && magMinus(0.01) > 5, 'both images blow up at b=0')
console.log('LensField magnification law: all assertions passed')
