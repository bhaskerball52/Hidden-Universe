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

// --- drift speeds must stay in a range a person can actually see -------------
// This exists because the fields once drifted at 0.006-0.03 px/frame, which is
// 4-16 px in TEN seconds: pixel-diff tests passed while the background looked
// completely frozen. Speeds are px/frame; the site runs at 60fps.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const num = (src, re) => [...src.matchAll(re)].map((m) => parseFloat(m[1]))

const VISIBLE_MIN = 0.1 // 6 px/s, the floor for "this is moving"
const VISIBLE_MAX = 1.2 // 72 px/s, above this it distracts from the content

const starfield = readFileSync(join(here, 'Starfield.jsx'), 'utf8')
const speeds = num(starfield, /speed: ([\d.]+)/g)
assert.ok(speeds.length >= 3, 'expected three hero layers')
for (const v of speeds) {
  assert.ok(v >= VISIBLE_MIN, `hero drift ${v} px/frame (${(v * 60).toFixed(0)} px/s) is too slow to see`)
  assert.ok(v <= VISIBLE_MAX, `hero drift ${v} px/frame is distractingly fast`)
}

const lens = readFileSync(join(here, 'LensField.jsx'), 'utf8')
const vxm = [...lens.matchAll(/vx: rand\(([\d.]+), ([\d.]+)\)/g)][0]
const vx = vxm ? [parseFloat(vxm[1]), parseFloat(vxm[2])] : []
assert.ok(vx.length && vx[0] >= VISIBLE_MIN, `lens drift ${vx[0]} px/frame is too slow to see`)

// Parallax must be strong enough that scrolling itself reads as movement.
const depths = num(starfield, /depth: ([\d.]+)/g)
assert.ok(depths.length >= 3, 'expected per-layer parallax depths')
assert.ok(Math.max(...depths) >= 0.25,
  `deepest hero parallax ${Math.max(...depths)} moves only ${(Math.max(...depths) * 285).toFixed(0)}px over a 285px scroll`)

console.log(`Drift speeds: hero ${speeds.map((v) => (v * 60).toFixed(0)).join('/')} px/s, ` +
  `lens ${(vx[0] * 60).toFixed(0)}-${(vx[1] * 60).toFixed(0)} px/s, parallax up to ${Math.max(...depths)}x - all visible`)
