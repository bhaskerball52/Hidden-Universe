import assert from 'node:assert/strict'
import {
  SUN_T, luminosityOf, radiusOf, temperatureOf, radiusFrom, luminosityFrom,
  lifetimeOf, evolvedState, spectralClass,
} from './stellar.js'
const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`)
const rel = (a, b, frac, what) => assert.ok(Math.abs(a - b) <= Math.abs(b) * frac, `${what}: ${a} vs ${b}`)

// The Sun must come out as the Sun. This is the anchor for everything else.
close(luminosityOf(1), 1, 1e-9, 'the Sun has luminosity 1')
close(radiusOf(1), 1, 1e-9, 'the Sun has radius 1')
close(temperatureOf(1), SUN_T, 1, 'the Sun has T = 5772 K')
close(lifetimeOf(1), 10, 1e-9, 'the Sun lives about 10 Gyr')

// Stefan-Boltzmann must round-trip: L -> R -> L.
for (const [L, T] of [[1, SUN_T], [100, 12000], [0.01, 3200], [1e4, 30000]]) {
  const R = radiusFrom(L, T)
  rel(luminosityFrom(R, T), L, 1e-9, `Stefan-Boltzmann round trip at L=${L}`)
}
// A red giant is big: 100 Lsun at 4000 K must be tens of solar radii.
const rg = radiusFrom(100, 4000)
assert.ok(rg > 15 && rg < 30, `red giant radius is tens of solar (got ${rg.toFixed(1)})`)
// A white dwarf is tiny: 0.01 Lsun at 15000 K is about 1% of the Sun.
const wd = radiusFrom(0.01, 15000)
assert.ok(wd < 0.02, `white dwarf is Earth-sized (got ${wd.toFixed(4)} Rsun)`)

// The main sequence must be monotonic: more massive is brighter, hotter, bigger.
let lastL = 0, lastT = 0
for (const m of [0.1, 0.3, 0.5, 1, 2, 5, 10, 30]) {
  const L = luminosityOf(m), T = temperatureOf(m)
  assert.ok(L > lastL, `luminosity rises with mass at ${m} Msun`)
  assert.ok(T > lastT, `temperature rises with mass at ${m} Msun`)
  lastL = L; lastT = T
}

// Massive stars are short-lived: this is the single most important consequence.
assert.ok(lifetimeOf(10) < lifetimeOf(1) / 100, 'a 10 Msun star lives <1% as long as the Sun')
assert.ok(lifetimeOf(0.3) > lifetimeOf(1) * 10, 'a 0.3 Msun star outlives the Sun many times over')

// Real anchor points, checked against measured stars rather than the model's
// own output. Sirius A is about 2 Msun, 25 Lsun, 9900 K.
rel(luminosityOf(2), 25, 0.5, 'Sirius A luminosity from 2 Msun')
assert.ok(temperatureOf(2) > 8000 && temperatureOf(2) < 12000, 'Sirius A temperature band')
// Spectral classes must land on the right letters.
assert.equal(spectralClass(SUN_T), 'G', 'the Sun is a G star')
assert.equal(spectralClass(9940), 'A', 'Sirius is an A star')
assert.equal(spectralClass(3500), 'M', 'a cool dwarf is an M star')
assert.equal(spectralClass(40000), 'O', 'the hottest are O stars')

// Evolution: a star must leave the main sequence, get brighter and cooler on
// the giant branch, then end faint and hot as a white dwarf.
const ms = evolvedState(1, 0)
close(ms.L, 1, 1e-9, 'f=0 is still the main sequence')
const giant = evolvedState(1, 0.5)
assert.ok(giant.L > ms.L * 50, 'the giant branch is far brighter')
assert.ok(giant.T < ms.T, 'the giant branch is cooler')
const end = evolvedState(1, 1)
assert.ok(end.L < ms.L, 'a white dwarf is fainter than the Sun')
assert.ok(end.T > ms.T, 'a white dwarf is hotter than the Sun')
assert.equal(end.phase, 'White dwarf', 'a 1 Msun star ends as a white dwarf')
// Above 8 Msun the track ends differently.
assert.equal(evolvedState(20, 1).phase, 'Supernova progenitor', 'massive stars do not end as white dwarfs')

// Luminosity must stay finite and positive through the whole track.
for (const m of [0.5, 1, 5, 20]) {
  for (let i = 0; i <= 50; i++) {
    const st = evolvedState(m, i / 50)
    assert.ok(Number.isFinite(st.L) && st.L > 0, `L finite at m=${m}, f=${i / 50}`)
    assert.ok(Number.isFinite(st.T) && st.T > 0, `T finite at m=${m}, f=${i / 50}`)
  }
}

console.log('Stellar relations: all assertions passed (Sun anchor, Stefan-Boltzmann, lifetimes, tracks)')

// Post-AGB: the exposed core crosses at constant luminosity, then settles on
// an Earth-sized white dwarf cooling line.
{
  const a = evolvedState(1, 0.79), b = evolvedState(1, 0.85)
  close(a.L, b.L, 1e-9, 'the post-AGB crossing is at constant luminosity')
  assert.ok(b.T > a.T * 5, 'and the core heats up as it crosses')
  const { radiusFrom } = await import('./stellar.js')
  for (const f of [0.95, 0.98, 1]) {
    const s = evolvedState(1, f)
    rel(radiusFrom(s.L, s.T), 0.013, 0.02, `white dwarf radius stays near 0.013 Rsun at f=${f}`)
  }
}
console.log('post-AGB and white dwarf track: ok')
