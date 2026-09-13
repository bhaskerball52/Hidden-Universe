// Blackbody radiation, in SI. Pure, unit-tested in BlackbodySpectra.check.mjs.

export const H = 6.62607015e-34   // Planck constant, J s
export const C = 2.99792458e8     // speed of light, m/s
export const KB = 1.380649e-23    // Boltzmann constant, J/K
export const SIGMA = 5.670374419e-8 // Stefan-Boltzmann, W/m^2/K^4
export const WIEN_B = 2.897771955e-3 // Wien displacement, m K

// Spectral radiance per unit wavelength, W / m^2 / m / sr.
export function planck(lambda, T) {
  if (lambda <= 0 || T <= 0) return 0
  const a = (2 * H * C * C) / Math.pow(lambda, 5)
  const x = (H * C) / (lambda * KB * T)
  // expm1 keeps precision in the Rayleigh-Jeans limit where exp(x)-1 loses it.
  return a / Math.expm1(x)
}

// Rayleigh-Jeans: the classical long-wavelength limit. Diverges at short
// wavelengths, which is the ultraviolet catastrophe Planck's law resolved.
export const rayleighJeans = (lambda, T) => (2 * C * KB * T) / Math.pow(lambda, 4)

// Wien approximation: the short-wavelength limit, dropping the -1.
export const wienApprox = (lambda, T) =>
  ((2 * H * C * C) / Math.pow(lambda, 5)) * Math.exp(-(H * C) / (lambda * KB * T))

// Wien displacement law: the peak moves inversely with temperature.
export const peakWavelength = (T) => WIEN_B / T

// Stefan-Boltzmann: total power radiated per unit area.
export const totalFlux = (T) => SIGMA * Math.pow(T, 4)

// Luminosity of a sphere of radius R at temperature T.
export const luminosity = (R, T) => 4 * Math.PI * R * R * totalFlux(T)

// Real absorption lines, at their measured wavelengths in nanometres. These are
// laboratory values, not fitted to anything in this scene.
export const LINES = [
  { nm: 393.4, label: 'Ca II K' },
  { nm: 410.2, label: 'H δ' },
  { nm: 434.0, label: 'H γ' },
  { nm: 486.1, label: 'H β' },
  { nm: 517.3, label: 'Mg b' },
  { nm: 589.0, label: 'Na D' },
  { nm: 656.3, label: 'H α' },
]

// Approximate sRGB for a wavelength in nm, for drawing the visible band.
export function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1 }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1 }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20 }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1 }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65 }
  else if (nm <= 780) { r = 1 }
  let f = 1
  if (nm > 700) f = 0.3 + (0.7 * (780 - nm)) / 80
  else if (nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40
  return [Math.round(255 * r * f), Math.round(255 * g * f), Math.round(255 * b * f)]
}

// CIE 1931 2-degree colour matching functions, the multi-lobe Gaussian fit of
// Wyman, Sloan and Shirley (2013). Accurate to a few percent of the tabulated
// functions, which is far below what a screen can show.
const lobe = (nm, mu, s1, s2) => {
  const t = (nm - mu) / (nm < mu ? s1 : s2)
  return Math.exp(-0.5 * t * t)
}
export function cie(nm) {
  return [
    1.056 * lobe(nm, 599.8, 37.9, 31.0) + 0.362 * lobe(nm, 442.0, 16.0, 26.7) - 0.065 * lobe(nm, 501.1, 20.4, 26.2),
    0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1),
    1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8),
  ]
}

// The colour a blackbody actually looks: Planck spectrum weighted by the eye's
// response, XYZ to linear sRGB, normalised to the brightest channel, then
// gamma-encoded. Colour only; brightness is a separate question. The peak
// wavelength alone is misleading: the Sun peaks in the green and looks white.
export function blackbodyColor(T) {
  let X = 0, Y = 0, Z = 0
  for (let nm = 380; nm <= 780; nm += 5) {
    const B = planck(nm * 1e-9, T)
    const [x, y, z] = cie(nm)
    X += B * x; Y += B * y; Z += B * z
  }
  const lin = [
    3.2406 * X - 1.5372 * Y - 0.4986 * Z,
    -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
    0.0557 * X - 0.204 * Y + 1.057 * Z,
  ].map((v) => Math.max(0, v))
  const m = Math.max(...lin) || 1
  const enc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)
  return lin.map((v) => Math.round(255 * enc(v / m)))
}

// How strong each absorption line is at a given temperature, 0 to 1. Balmer
// lines need hydrogen excited to n=2 but not yet ionised, so they peak in A
// stars near 9,500 K; ionised calcium peaks in G and K stars; neutral sodium
// and magnesium survive only in cool atmospheres. Those are the Saha-Boltzmann
// trends behind the OBAFGKM sequence, modelled here as log-normal bumps rather
// than a full line-transfer calculation.
const LINE_PEAK = { H: [9500, 0.15], 'Ca II': [5200, 0.17], Mg: [4800, 0.14], Na: [4000, 0.13] }
export function lineStrength(label, T) {
  const key = label.startsWith('H') ? 'H' : label.startsWith('Ca') ? 'Ca II' : label.startsWith('Mg') ? 'Mg' : 'Na'
  const [peak, width] = LINE_PEAK[key]
  const t = (Math.log10(T) - Math.log10(peak)) / width
  return 0.06 + 0.94 * Math.exp(-0.5 * t * t)
}
