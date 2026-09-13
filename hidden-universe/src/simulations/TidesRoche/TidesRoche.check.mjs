import assert from 'node:assert/strict'
import {
  G, tidalAcceleration, exactDifferential, rocheRigid, rocheFluid,
  bulgeHeight, surfaceGravity, massOf, isDisrupted,
} from './tides.js'
const rel = (a, b, frac, what) => assert.ok(Math.abs(a - b) <= Math.abs(b) * frac, `${what}: ${a} vs ${b}`)

// Real bodies, measured values.
const M_EARTH = 5.972e24, R_EARTH = 6.371e6
const M_MOON = 7.342e22, R_MOON = 1.737e6
const D_MOON = 3.844e8
const M_SUN = 1.989e30, D_SUN = 1.496e11
const RHO_EARTH = 5514, RHO_MOON = 3344

// The tidal field falls off as the cube of distance, which is the single most
// important fact here: it is why the Moon beats the Sun despite being tiny.
rel(tidalAcceleration(M_EARTH, 2 * D_MOON, R_MOON) / tidalAcceleration(M_EARTH, D_MOON, R_MOON),
  1 / 8, 1e-9, 'tidal force falls as 1/d^3')

// The Moon raises a bigger tide on Earth than the Sun does, by about 2.2 times,
// even though the Sun's pull is 175 times stronger. This is the classic check.
const tideMoon = tidalAcceleration(M_MOON, D_MOON, R_EARTH)
const tideSun = tidalAcceleration(M_SUN, D_SUN, R_EARTH)
rel(tideMoon / tideSun, 2.2, 0.1, 'the Moon dominates Earth tides')
// While the direct gravitational pull is the other way round entirely.
const pullSun = (G * M_SUN) / (D_SUN * D_SUN)
const pullMoon = (G * M_MOON) / (D_MOON * D_MOON)
assert.ok(pullSun > pullMoon * 100, 'yet the Sun pulls far harder overall')

// The 2GMr/d^3 approximation must match the exact difference when r << d.
rel(tidalAcceleration(M_EARTH, D_MOON, R_MOON),
  exactDifferential(M_EARTH, D_MOON, R_MOON), 0.02, 'approximation matches the exact field')

// Roche limits. The Moon is far outside Earth's, so it is safe.
const roche = rocheFluid(R_EARTH, RHO_EARTH, RHO_MOON)
rel(roche / R_EARTH, 2.9, 0.05, "Earth's fluid Roche limit is about 2.9 Earth radii")
// The Moon sits about 21 Roche limits out, which is why it is comfortably safe.
assert.ok(D_MOON > roche * 20, 'the Moon orbits far outside the Roche limit')
rel(D_MOON / roche, 20.8, 0.05, 'the Moon is about 21 Roche limits away')
assert.ok(!isDisrupted(D_MOON, R_EARTH, RHO_EARTH, RHO_MOON), 'the Moon is not being torn apart')
assert.ok(isDisrupted(2 * R_EARTH, R_EARTH, RHO_EARTH, RHO_MOON), 'but it would be at two Earth radii')

// A fluid body breaks up further out than a rigid one, since it deforms first.
assert.ok(rocheFluid(R_EARTH, RHO_EARTH, RHO_MOON) > rocheRigid(R_EARTH, RHO_EARTH, RHO_MOON),
  'fluid Roche limit exceeds the rigid one')

// Saturn's rings sit inside its Roche limit, which is the textbook example.
const R_SAT = 5.8232e7, RHO_SAT = 687, RHO_ICE = 900
const rocheSat = rocheFluid(R_SAT, RHO_SAT, RHO_ICE)
rel(rocheSat / R_SAT, 2.22, 0.05, "Saturn's Roche limit is about 2.2 Saturn radii")
// The B ring (out to 1.175e8 m) is well inside the limit, so its particles can
// never coalesce into a moon. The A ring straddles it, and Titan is far outside.
assert.ok(1.175e8 < rocheSat, 'the B ring lies inside the Roche limit')
assert.ok(1.222e8 < rocheSat && 1.367e8 > rocheSat, 'the A ring straddles it')
assert.ok(1.222e9 > rocheSat, 'Titan orbits far outside it and survives')

// A denser moon survives closer in, which is why dense moons orbit where icy
// ones cannot.
assert.ok(rocheFluid(R_SAT, RHO_SAT, 3000) < rocheFluid(R_SAT, RHO_SAT, 900),
  'denser moons can orbit closer')

// Bulge height must grow with the companion's mass and shrink fast with distance.
assert.ok(bulgeHeight(M_MOON, M_EARTH, R_EARTH, D_MOON) > 0, 'a bulge is raised')
rel(bulgeHeight(M_MOON, M_EARTH, R_EARTH, D_MOON) /
  bulgeHeight(M_MOON, M_EARTH, R_EARTH, 2 * D_MOON), 8, 1e-9, 'bulge falls as 1/d^3')

// Sanity on self-gravity: Earth 9.8, Moon 1.62 m/s^2.
rel(surfaceGravity(M_EARTH, R_EARTH), 9.82, 0.01, "Earth's surface gravity")
rel(surfaceGravity(M_MOON, R_MOON), 1.62, 0.02, "the Moon's surface gravity")
rel(massOf(RHO_EARTH, R_EARTH), M_EARTH, 0.01, 'Earth mass from density and radius')

console.log('Tidal mechanics: all assertions passed (1/d^3, Moon beats Sun, Roche limits for Earth and Saturn)')
