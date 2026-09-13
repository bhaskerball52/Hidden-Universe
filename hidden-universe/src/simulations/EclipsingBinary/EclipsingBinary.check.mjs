import assert from 'node:assert/strict'
import {
  barycentreSplit, overlapArea, surfaceBrightness, systemFlux,
  projectedSeparation, rocheLobe, binaryPeriod,
} from './binary.js'
const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`)
const rel = (a, b, frac, what) => assert.ok(Math.abs(a - b) <= Math.abs(b) * frac, `${what}: ${a} vs ${b}`)

// Barycentre: equal masses split the separation evenly; a heavier star moves less.
const eq = barycentreSplit(1, 1, 10)
close(eq.a1, 5, 1e-12, 'equal masses orbit the midpoint')
const un = barycentreSplit(3, 1, 8)
close(un.a1, 2, 1e-12, 'the heavy star stays closer in')
close(un.a2, 6, 1e-12, 'the light star swings wider')
close(un.a1 + un.a2, 8, 1e-12, 'the two radii sum to the separation')
// Sun-Jupiter: the barycentre sits just outside the Sun's surface.
const sj = barycentreSplit(1, 9.55e-4, 5.203 * 1.496e11)
rel(sj.a1, 7.42e8, 0.05, 'the Sun-Jupiter barycentre is just above the solar surface')

// Circle overlap, checked against cases with exact answers.
close(overlapArea(10, 1, 1), 0, 1e-12, 'no overlap when far apart')
close(overlapArea(0, 1, 2), Math.PI, 1e-12, 'concentric: the smaller disk is fully covered')
close(overlapArea(0.5, 3, 1), Math.PI, 1e-12, 'small disk entirely inside the large one')
// Two unit circles whose centres are 1 apart: the classic lens area.
rel(overlapArea(1, 1, 1), 2 * Math.PI / 3 - Math.sqrt(3) / 2, 1e-9, 'unit circles at d=1')
// Just touching is zero, and overlap grows monotonically as they close.
close(overlapArea(2, 1, 1), 0, 1e-9, 'tangent circles have no overlap')
let prev = -1
for (const d of [2, 1.5, 1.0, 0.5, 0]) {
  const ov = overlapArea(d, 1, 1)
  assert.ok(ov > prev, `overlap grows as the stars close (d=${d})`)
  prev = ov
}

// Light curve. Out of eclipse the flux is exactly 1.
close(systemFlux(10, 1, 0.6, 10, 1, true), 1, 1e-12, 'no eclipse means full brightness')
// The two eclipses have different depths, which is the key observable: the
// deeper one is when the HOTTER star is hidden.
const r1 = 1, r2 = 0.6, L1 = 10, L2 = 1
assert.ok(surfaceBrightness(L1, r1) > surfaceBrightness(L2, r2), 'star 1 has the higher surface brightness')
const primary = systemFlux(0, r1, r2, L1, L2, true)    // small star in front of big bright one
const secondary = systemFlux(0, r1, r2, L1, L2, false) // big star in front of small faint one
assert.ok(primary < secondary, 'the primary eclipse is the deeper one')
// Depth of the primary equals the covered area times the hidden surface brightness.
const expected = 1 - (Math.PI * r2 * r2 * surfaceBrightness(L1, r1)) / (L1 + L2)
rel(primary, expected, 1e-9, 'primary depth from area times surface brightness')
// Flux must stay physical everywhere.
for (let i = 0; i <= 60; i++) {
  const f = systemFlux((i / 60) * 3, r1, r2, L1, L2, i % 2 === 0)
  assert.ok(f >= 0 && f <= 1 + 1e-12, `flux in [0,1] (got ${f})`)
}

// Geometry: edge-on gives a central eclipse, face-on gives none at all.
close(projectedSeparation(0, 5, 90).d, 0, 1e-9, 'edge-on, phase 0 is a central eclipse')
close(projectedSeparation(0, 5, 0).d, 5, 1e-9, 'face-on shows the full separation, so no eclipse')
assert.ok(projectedSeparation(0, 5, 80).d > 0, 'a tilted orbit gives a grazing eclipse')
close(projectedSeparation(0.25, 5, 90).d, 5, 1e-9, 'quarter phase is maximum separation')

// Roche lobes. Equal masses give equal lobes, each about 38% of the separation.
rel(rocheLobe(1, 1), 0.3789, 0.01, 'equal-mass Roche lobe is 0.379a')
close(rocheLobe(1, 10) / rocheLobe(1, 1), 10, 1e-9, 'the lobe scales with separation')
assert.ok(rocheLobe(3, 1) > rocheLobe(1 / 3, 1), 'the more massive star gets the bigger lobe')

// Kepler's third law for a binary, checked on the Earth-Sun system.
rel(binaryPeriod(1, 1, 3e-6), 1, 0.01, 'a 1 AU orbit around 1 solar mass takes a year')
rel(binaryPeriod(1, 2, 0), 1 / Math.sqrt(2), 1e-9, 'more mass means a shorter period')

console.log('Eclipsing binary: all assertions passed (barycentre, exact overlap, eclipse depths, Roche lobes)')
