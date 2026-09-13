import assert from 'node:assert/strict'
import {
  planck, rayleighJeans, wienApprox, peakWavelength, totalFlux, luminosity,
  WIEN_B, SIGMA, LINES,
} from './planck.js'
const rel = (a, b, frac, what) => assert.ok(Math.abs(a - b) <= Math.abs(b) * frac, `${what}: ${a} vs ${b}`)

// Wien's law against measured values. The Sun peaks around 500 nm, which is
// why our eyes are most sensitive there.
rel(peakWavelength(5772), 502e-9, 0.01, 'the Sun peaks near 500 nm')
rel(peakWavelength(2.725), 1.063e-3, 0.01, 'the CMB peaks near 1 mm')
rel(peakWavelength(3000) / peakWavelength(6000), 2, 1e-12, 'halving T doubles the peak wavelength')

// The Planck curve's own maximum must land where Wien's law says.
for (const T of [1000, 3000, 5772, 12000]) {
  let best = 0, bestL = 0
  for (let i = 1; i <= 40000; i++) {
    const lam = (i / 40000) * 30e-6
    const v = planck(lam, T)
    if (v > best) { best = v; bestL = lam }
  }
  rel(bestL, WIEN_B / T, 0.01, `numeric peak matches Wien at ${T} K`)
}

// Stefan-Boltzmann: integrating Planck over wavelength and solid angle must
// reproduce sigma*T^4. This ties the two laws together.
for (const T of [2000, 5772]) {
  let sum = 0
  const N = 200000, maxL = 60e-6
  for (let i = 1; i <= N; i++) {
    const lam = (i / N) * maxL
    sum += planck(lam, T) * (maxL / N)
  }
  rel(Math.PI * sum, totalFlux(T), 0.02, `integrated Planck gives sigma T^4 at ${T} K`)
}
rel(totalFlux(2 * 5772) / totalFlux(5772), 16, 1e-9, 'doubling T gives 16 times the flux')

// The Sun's luminosity from its measured radius and temperature.
rel(luminosity(6.957e8, 5772), 3.828e26, 0.02, 'solar luminosity from R and T')

// Rayleigh-Jeans must match Planck at long wavelengths and blow up at short
// ones. That divergence is the ultraviolet catastrophe.
// Rayleigh-Jeans is the x -> 0 limit, so the right test is that the error
// shrinks as the wavelength grows, not that it matches at one arbitrary point.
// At 1 cm and 300 K the leading correction is x/2, about 0.24%, which is
// physics rather than a bug.
{
  const err = (lam) => Math.abs(rayleighJeans(lam, 300) - planck(lam, 300)) / planck(lam, 300)
  const e1 = err(1e-3), e2 = err(1e-2), e3 = err(1e-1)
  assert.ok(e3 < e2 && e2 < e1, `RJ error must shrink with wavelength (${e1}, ${e2}, ${e3})`)
  assert.ok(e3 < 1e-3, `RJ is accurate in the far infrared (${e3})`)
  assert.ok(e1 > e3 * 10, 'and measurably worse at shorter wavelengths')
}
assert.ok(rayleighJeans(100e-9, 5772) > planck(100e-9, 5772) * 1000,
  'Rayleigh-Jeans diverges in the ultraviolet')
// Wien's approximation is the opposite limit.
rel(wienApprox(200e-9, 5772), planck(200e-9, 5772), 1e-3, 'Wien approximation holds at short wavelengths')
assert.ok(wienApprox(1e-2, 300) < planck(1e-2, 300) * 0.99, 'Wien approximation fails in the far infrared')

// Physical sanity: positive, finite, and falling to zero at both extremes.
for (const T of [300, 5772, 30000]) {
  for (const lam of [1e-9, 1e-7, 1e-5, 1e-3]) {
    const v = planck(lam, T)
    assert.ok(Number.isFinite(v) && v >= 0, `finite and non-negative at ${lam} m, ${T} K`)
  }
  assert.ok(planck(1e-12, T) < planck(peakWavelength(T), T) * 1e-6, 'falls to zero at short wavelengths')
}
// A hotter body is brighter at every single wavelength.
for (const lam of [200e-9, 500e-9, 2e-6]) {
  assert.ok(planck(lam, 7000) > planck(lam, 5000), `hotter is brighter at ${lam} m`)
}

// The spectral lines must be the real laboratory wavelengths.
const byLabel = Object.fromEntries(LINES.map((l) => [l.label, l.nm]))
rel(byLabel['H α'], 656.3, 1e-4, 'H alpha')
rel(byLabel['H β'], 486.1, 1e-4, 'H beta')
rel(byLabel['Na D'], 589.0, 1e-4, 'sodium D')

console.log('Blackbody radiation: all assertions passed (Wien, Stefan-Boltzmann, both limits, solar luminosity)')

// Perceived colour. D65 white is defined near a 6,500 K blackbody, so that
// should come out close to neutral; cooler is orange, hotter is blue.
{
  const { blackbodyColor, lineStrength, cie } = await import('./planck.js')
  const [r65, g65, b65] = blackbodyColor(6504)
  assert.ok(Math.min(r65, g65, b65) / Math.max(r65, g65, b65) > 0.9, `6504 K is near white: ${r65},${g65},${b65}`)
  const [r3, g3, b3] = blackbodyColor(3000)
  assert.ok(r3 > g3 && g3 > b3, `3000 K is orange: ${r3},${g3},${b3}`)
  const [r15, , b15] = blackbodyColor(15000)
  assert.ok(b15 > r15, `15000 K is blue-white: ${blackbodyColor(15000)}`)
  const sun = blackbodyColor(5772)
  assert.ok(sun[0] >= sun[1] && sun[1] >= sun[2] && sun[2] > 200, `the Sun is a warm white, not green: ${sun}`)
  // The CMF fit peaks where the tabulated functions do.
  assert.ok(cie(555)[1] > 0.95 && cie(555)[1] < 1.05, 'y-bar peaks near 1 at 555 nm')
  // Balmer strongest in A stars, sodium in cool stars.
  assert.ok(lineStrength('H α', 9500) > lineStrength('H α', 4000) && lineStrength('H α', 9500) > lineStrength('H α', 25000), 'Balmer peaks near 9500 K')
  assert.ok(lineStrength('Na D', 3800) > lineStrength('Na D', 9000), 'sodium is a cool-star line')
}
console.log('blackbody colour and line strengths: ok')
