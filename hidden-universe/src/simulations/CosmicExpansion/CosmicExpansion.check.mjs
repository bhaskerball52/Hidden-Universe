import assert from 'node:assert/strict'
import {
  H0, properDistance, recessionSpeed, redshiftFrom, scaleFromRedshift,
  hubbleTimeGyr, hubbleRadiusMpc, scaleAt,
} from './cosmo.js'
const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`)
const rel = (a, b, frac, what) => assert.ok(Math.abs(a - b) <= Math.abs(b) * frac, `${what}: ${a} vs ${b}`)

// Scale factor is 1 today, so proper and comoving distances agree now.
close(properDistance(100, 1), 100, 1e-12, 'a=1 means proper equals comoving')
close(properDistance(100, 0.5), 50, 1e-12, 'half the scale factor, half the distance')

// Hubble's law is linear, and that linearity is what makes it centre-free.
close(recessionSpeed(1), H0, 1e-12, '1 Mpc recedes at H0')
close(recessionSpeed(100), 100 * H0, 1e-12, 'ten times farther, ten times faster')

// No centre: from any galaxy, every other still obeys v = H*d. Check it by
// shifting to another galaxy's rest frame in a uniformly expanding grid.
const galaxies = [-3, -1, 0, 2, 5, 9].map((x) => ({ x }))
for (const origin of galaxies) {
  for (const g of galaxies) {
    if (g === origin) continue
    const d = g.x - origin.x                       // separation seen by this observer
    const v = recessionSpeed(g.x) - recessionSpeed(origin.x) // velocity difference
    close(v, recessionSpeed(d), 1e-9, `Hubble law holds from x=${origin.x}`)
  }
}

// Redshift and scale factor are inverses of each other.
close(redshiftFrom(1), 0, 1e-12, 'light emitted now has no redshift')
close(redshiftFrom(0.5), 1, 1e-12, 'a=0.5 gives z=1')
close(redshiftFrom(0.25), 3, 1e-12, 'a=0.25 gives z=3')
for (const z of [0, 0.5, 1, 3, 7, 1100]) {
  close(redshiftFrom(scaleFromRedshift(z)), z, 1e-9, `round trip at z=${z}`)
}
// The cosmic microwave background: emitted when the universe was 1/1100 its size.
rel(scaleFromRedshift(1100), 1 / 1101, 1e-9, 'CMB scale factor')

// Hubble time and radius, against the textbook values for H0 = 70.
rel(hubbleTimeGyr(), 13.97, 0.01, 'Hubble time is about 14 Gyr')
rel(hubbleRadiusMpc(), 4283, 0.01, 'Hubble radius is about 4.3 Gpc')
// A faster expansion means a younger universe.
assert.ok(hubbleTimeGyr(100) < hubbleTimeGyr(50), 'larger H0 means less time')

// Matter-dominated growth: expanding, decelerating, and a=1 at t=1.
close(scaleAt(1), 1, 1e-12, 'normalised to a=1 today')
assert.ok(scaleAt(0.5) < scaleAt(1), 'the universe was smaller in the past')
assert.ok(scaleAt(2) > scaleAt(1), 'and larger in the future')
const early = scaleAt(0.2) - scaleAt(0.1)
const late = scaleAt(2.0) - scaleAt(1.9)
assert.ok(early > late, 'matter-dominated expansion decelerates')

// H(t) must equal (da/dt)/a for the scale factor above, checked numerically.
{
  const { hubbleAt } = await import('./cosmo.js')
  close(hubbleAt(1), H0, 1e-12, 'H(1) is H0')
  for (const t of [0.3, 0.8, 1.5, 2.2]) {
    const h = 1e-6
    const numeric = ((scaleAt(t + h) - scaleAt(t - h)) / (2 * h)) / scaleAt(t)
    rel(hubbleAt(t) / H0, numeric / (2 / 3), 1e-6, `H(t) = adot/a at t=${t}`)
  }
}

console.log('Expansion kinematics: all assertions passed (Hubble law from every observer, redshift, CMB, Hubble time)')
