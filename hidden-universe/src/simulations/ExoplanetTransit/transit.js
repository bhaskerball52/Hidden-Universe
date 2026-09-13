// Transit photometry. Pure functions, unit-tested in ExoplanetTransit.check.mjs.

// Quadratic limb darkening. mu = cos(theta) is the direction cosine toward the
// observer, 1 at disk centre and 0 at the limb. Solar values are near u1=0.4,
// u2=0.26, which is why the Sun looks noticeably darker at its edge.
export const limbIntensity = (mu, u1, u2) => 1 - u1 * (1 - mu) - u2 * (1 - mu) * (1 - mu)

// Total flux of a limb-darkened disk of unit radius, integrated over the disk.
// Analytic: 2*pi*integral_0^1 I(mu(r)) r dr with mu = sqrt(1-r^2).
export const totalFlux = (u1, u2) => Math.PI * (1 - u1 / 3 - u2 / 6)

// Planet centre offset from star centre, in stellar radii, at orbital phase.
// b is the impact parameter: 0 is a central transit, 1 grazes the limb.
export function separation(phase, aOverR, b) {
  // Projected separation for a circular orbit. The 2*pi*phase convention puts
  // mid-transit at phase 0.
  const x = aOverR * Math.sin(2 * Math.PI * phase)
  const y = b * Math.cos(2 * Math.PI * phase)
  return { d: Math.hypot(x, y), x, y, behind: Math.cos(2 * Math.PI * phase) < 0 }
}

// Occulted flux by numerical integration over the planet's disk. Exact enough
// for photometry at this resolution and far simpler to trust than the analytic
// Mandel-Agol expressions.
export function occultedFlux(d, k, u1, u2, samples = 64) {
  if (d >= 1 + k) return 0          // no overlap
  let acc = 0
  const step = (2 * k) / samples
  for (let i = 0; i < samples; i++) {
    const px = -k + (i + 0.5) * step
    for (let j = 0; j < samples; j++) {
      const py = -k + (j + 0.5) * step
      if (px * px + py * py > k * k) continue      // outside the planet
      const rx = d + px
      const r2 = rx * rx + py * py
      if (r2 >= 1) continue                        // off the stellar disk
      const mu = Math.sqrt(1 - r2)
      acc += limbIntensity(mu, u1, u2) * step * step
    }
  }
  return acc
}

// Relative flux during transit: 1 outside, dipping to 1 - depth at centre.
export function relativeFlux(d, k, u1, u2, samples = 64) {
  return 1 - occultedFlux(d, k, u1, u2, samples) / totalFlux(u1, u2)
}

// Transit depth for a uniform disk is exactly the area ratio. Limb darkening
// makes the real depth deeper than this, because the planet covers the bright
// middle of the star.
export const geometricDepth = (k) => k * k

// Total transit duration as a fraction of the orbital period.
export function durationFraction(aOverR, b, k) {
  const arg = (1 + k) * (1 + k) - b * b
  if (arg <= 0) return 0
  return Math.asin(Math.sqrt(arg) / aOverR) / Math.PI
}
