import assert from 'node:assert/strict'
import {
  lorentzGamma, aberrate, deaberrate, dopplerFactor, observedWavelength,
  beaming, headlightAngle, properTime, contractedLength, kineticEnergy,
} from './relativity.js'
const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`)
const rel = (a, b, frac, what) => assert.ok(Math.abs(a - b) <= Math.abs(b) * frac, `${what}: ${a} vs ${b}`)

// Gamma: 1 at rest, and the standard values.
close(lorentzGamma(0), 1, 1e-12, 'gamma is 1 at rest')
close(lorentzGamma(0.6), 1.25, 1e-12, 'beta 0.6 gives gamma 1.25')
close(lorentzGamma(0.8), 5 / 3, 1e-12, 'beta 0.8 gives gamma 5/3')
assert.ok(lorentzGamma(0.999) > 22, 'gamma diverges as beta approaches 1')

// Aberration must be an exact inverse pair, and must preserve the poles.
for (const beta of [0, 0.3, 0.7, 0.95]) {
  for (const c of [-1, -0.5, 0, 0.5, 1]) {
    close(deaberrate(aberrate(c, beta), beta), c, 1e-9, `aberration round trip beta=${beta}`)
    const ab = aberrate(c, beta)
    assert.ok(ab >= -1 - 1e-12 && ab <= 1 + 1e-12, 'cosine stays in range')
  }
  close(aberrate(1, beta), 1, 1e-12, 'dead ahead stays dead ahead')
  close(aberrate(-1, beta), -1, 1e-12, 'dead astern stays dead astern')
}
// Stars crowd forward: a star at 90 degrees appears ahead of you.
assert.ok(aberrate(0, 0.8) > 0, 'a sideways star shifts forward at 0.8c')
close(aberrate(0, 0.8), 0.8, 1e-12, 'the shift is exactly beta for a sideways star')
// At rest nothing moves.
for (const c of [-1, -0.3, 0.4, 1]) close(aberrate(c, 0), c, 1e-12, 'no aberration at rest')

// Doppler: blueshift ahead, redshift behind, and time dilation alone sideways.
close(dopplerFactor(1, 0), 1, 1e-12, 'no shift at rest')
assert.ok(dopplerFactor(1, 0.6) > 1, 'ahead is blueshifted')
assert.ok(dopplerFactor(-1, 0.6) < 1, 'behind is redshifted')
close(dopplerFactor(1, 0.6), 2, 1e-12, 'beta 0.6 head-on doubles the frequency')
close(dopplerFactor(-1, 0.6), 0.5, 1e-12, 'and halves it astern')
// Transverse Doppler is pure time dilation, a purely relativistic effect with
// no classical counterpart.
close(dopplerFactor(0, 0.6), 1 / 1.25, 1e-12, 'transverse Doppler is 1/gamma')
assert.ok(dopplerFactor(0, 0.6) < 1, 'sideways light is redshifted even though nothing approaches or recedes')

// Wavelengths move the right way. H-alpha at 656 nm seen head-on at 0.6c.
close(observedWavelength(656.3, 1, 0.6), 328.15, 1e-6, 'head-on halves the wavelength')
assert.ok(observedWavelength(656.3, -1, 0.6) > 656.3, 'astern stretches it')

// Beaming: the fourth power, so forward intensity explodes.
close(beaming(1, 0.6), 16, 1e-9, 'head-on intensity is D^4 = 16 at beta 0.6')
rel(beaming(1, 0.9), 361, 0.01, 'head-on intensity is 361x at 0.9c')
assert.ok(beaming(1, 0.99) > 3e4, 'and tens of thousands at 0.99c')
assert.ok(beaming(-1, 0.9) < 0.01, 'while the view astern goes almost dark')

// The headlight cone closes as speed rises.
close(headlightAngle(0), Math.PI / 2, 1e-12, 'at rest light fills the hemisphere')
assert.ok(headlightAngle(0.99) < 0.15, 'at 0.99c the light is squeezed into a narrow cone')
assert.ok(headlightAngle(0.6) > headlightAngle(0.9), 'the cone narrows with speed')

// Time dilation and length contraction, the textbook numbers.
close(properTime(10, 0.6), 8, 1e-12, 'ten years coordinate is eight aboard at 0.6c')
close(contractedLength(1, 0.8), 0.6, 1e-12, 'a metre contracts to 60 cm at 0.8c')
// Kinetic energy diverges, which is why c cannot be reached.
close(kineticEnergy(0), 0, 1e-12, 'no kinetic energy at rest')
close(kineticEnergy(0.6), 0.25, 1e-12, 'KE is 0.25 mc^2 at beta 0.6')
assert.ok(kineticEnergy(0.999) > 21, 'energy cost explodes near c')
// Low-speed limit must reduce to the classical 1/2 mv^2.
rel(kineticEnergy(0.01), 0.5 * 0.01 * 0.01, 1e-3, 'reduces to Newtonian KE at low speed')

console.log('Special relativity: all assertions passed (aberration, Doppler, transverse shift, beaming, dilation)')
