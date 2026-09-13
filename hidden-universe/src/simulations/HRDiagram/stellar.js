// Stellar structure relations, in solar units. Pure and unit-tested in
// HRDiagram.check.mjs. These are the standard power-law approximations, which
// is what makes the main sequence a line rather than a traced curve.

export const SUN_T = 5772 // K

// Mass-luminosity relation. The exponent is not constant across the whole main
// sequence: low-mass stars are steeper than the textbook 3.5.
export function luminosityOf(mass) {
  if (mass < 0.43) return 0.23 * Math.pow(mass, 2.3)
  if (mass < 2) return Math.pow(mass, 4)
  if (mass < 55) return 1.4 * Math.pow(mass, 3.5)
  return 32000 * mass
}

// Main-sequence radius, again a broken power law.
export const radiusOf = (mass) => (mass < 1 ? Math.pow(mass, 0.8) : Math.pow(mass, 0.57))

// Effective temperature follows from luminosity and radius by Stefan-Boltzmann.
export const temperatureOf = (mass) =>
  SUN_T * Math.pow(luminosityOf(mass) / (radiusOf(mass) * radiusOf(mass)), 0.25)

// Radius from luminosity and temperature, the relation the contours use.
export const radiusFrom = (L, T) => Math.sqrt(L) / Math.pow(T / SUN_T, 2)

// Luminosity of a star of given radius and temperature.
export const luminosityFrom = (R, T) => R * R * Math.pow(T / SUN_T, 4)

// Main-sequence lifetime. The Sun gets about 10 Gyr; a 10 solar-mass star burns
// out a thousand times faster.
export const lifetimeOf = (mass) => 10 * (mass / luminosityOf(mass))

// Where a star sits after leaving the main sequence. Fraction f runs 0 to 1
// across the post-main-sequence phase, which is brief compared with the rest.
export function evolvedState(mass, f) {
  const L0 = luminosityOf(mass)
  const T0 = temperatureOf(mass)
  if (f <= 0) return { L: L0, T: T0, phase: 'Main sequence' }
  if (f < 0.55) {
    // Subgiant then red giant: swells and cools while luminosity climbs.
    const u = f / 0.55
    return {
      L: L0 * Math.pow(10, 2.2 * u),
      T: T0 * Math.pow(10, -0.33 * u),
      phase: u < 0.4 ? 'Subgiant' : 'Red giant',
    }
  }
  if (f < 0.78) {
    // Helium burning: a loop back to the blue at nearly constant luminosity.
    const u = (f - 0.55) / 0.23
    return {
      L: L0 * Math.pow(10, 2.2 - 0.35 * u),
      T: T0 * Math.pow(10, -0.33 + 0.22 * u),
      phase: 'Helium burning',
    }
  }
  // Envelope ejected. Low- and intermediate-mass stars expose their core, which
  // first crosses to the left at nearly constant luminosity (the post-AGB
  // track, lighting a planetary nebula), then drops onto the white dwarf
  // cooling line of fixed radius, about Earth-sized.
  const u = (f - 0.78) / 0.22
  if (mass >= 8) {
    return { L: L0 * Math.pow(10, 1.85), T: T0 * Math.pow(10, -0.11), phase: 'Supernova progenitor' }
  }
  const Ltip = L0 * Math.pow(10, 1.85)
  const Ttip = T0 * Math.pow(10, -0.11)
  const T_CORE = 100000
  const WD_R = 0.013
  if (u < 0.42) {
    const v = u / 0.42
    return { L: Ltip, T: Ttip * Math.pow(T_CORE / Ttip, v), phase: 'Planetary nebula core' }
  }
  const Lknee = luminosityFrom(WD_R, T_CORE)
  if (u < 0.58) {
    const v = (u - 0.42) / 0.16
    return { L: Ltip * Math.pow(Lknee / Ltip, v), T: T_CORE, phase: 'Planetary nebula core' }
  }
  const v = (u - 0.58) / 0.42
  const T = T_CORE * Math.pow(9000 / T_CORE, v)
  return { L: luminosityFrom(WD_R, T), T, phase: 'White dwarf' }
}

// Rough spectral class from temperature, for labelling the axis.
export function spectralClass(T) {
  if (T > 30000) return 'O'
  if (T > 10000) return 'B'
  if (T > 7500) return 'A'
  if (T > 6000) return 'F'
  if (T > 5200) return 'G'
  if (T > 3700) return 'K'
  return 'M'
}
