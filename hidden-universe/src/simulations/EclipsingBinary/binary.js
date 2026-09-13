// Eclipsing binary photometry and orbits. Pure, unit-tested.

// Barycentre: the two stars orbit their common centre of mass, with radii
// inversely proportional to their masses. The heavier star moves less.
export const barycentreSplit = (m1, m2, a) => ({ a1: (a * m2) / (m1 + m2), a2: (a * m1) / (m1 + m2) })

// Overlap area of two circles, radii r1 and r2, centres d apart.
// This is what produces the light curve; there is no need to approximate it.
export function overlapArea(d, r1, r2) {
  if (d >= r1 + r2) return 0                          // no contact
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2  // total
  const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1))
  const a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2))
  return r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2)
}

// Surface brightness from luminosity and radius.
export const surfaceBrightness = (L, R) => L / (Math.PI * R * R)

// Combined flux when star B is in front of star A (or vice versa). The eclipsed
// light is the overlap area times the surface brightness of whichever star is
// behind, which is why the two eclipses have different depths.
export function systemFlux(d, r1, r2, L1, L2, frontIsTwo) {
  const total = L1 + L2
  const ov = overlapArea(d, r1, r2)
  if (ov <= 0) return 1
  const hidden = frontIsTwo ? ov * surfaceBrightness(L1, r1) : ov * surfaceBrightness(L2, r2)
  return Math.max(0, (total - hidden) / total)
}

// Projected separation of the two stars at orbital phase, for inclination i.
// phase 0 is star 2 in front (primary eclipse for a hotter star 1).
export function projectedSeparation(phase, a, incDeg) {
  const i = (incDeg * Math.PI) / 180
  const th = 2 * Math.PI * phase
  const x = a * Math.sin(th)
  const y = a * Math.cos(th) * Math.cos(i)
  return { d: Math.hypot(x, y), x, y, frontIsTwo: Math.cos(th) > 0 }
}

// Roche lobe radius, Eggleton's fit. Accurate to better than 1% over the whole
// mass-ratio range, which is why it is the standard formula.
export function rocheLobe(q, a) {
  const q13 = Math.cbrt(q)
  const q23 = q13 * q13
  return (a * 0.49 * q23) / (0.6 * q23 + Math.log(1 + q13))
}

// Kepler's third law for a binary, in solar masses, AU and years.
export const binaryPeriod = (a, m1, m2) => Math.sqrt((a * a * a) / (m1 + m2))
