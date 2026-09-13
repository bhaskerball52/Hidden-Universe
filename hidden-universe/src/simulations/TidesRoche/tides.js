// Tidal mechanics. Pure, unit-tested in TidesRoche.check.mjs.

export const G = 6.674e-11

// The tidal force is the DIFFERENCE in gravity across a body, not the pull
// toward the companion. That difference is what raises two bulges, one facing
// the companion and one on the far side.
export const tidalAcceleration = (M, d, r) => (2 * G * M * r) / Math.pow(d, 3)

// Exact differential field along the line of centres, for comparison with the
// 2GMr/d^3 approximation above.
export const exactDifferential = (M, d, r) =>
  G * M * (1 / Math.pow(d - r, 2) - 1 / Math.pow(d, 2))

// Roche limit for a rigid body: the distance inside which tidal forces exceed
// the moon's own self-gravity and pull it apart.
export const rocheRigid = (Rprimary, densityPrimary, densityMoon) =>
  Rprimary * Math.pow((2 * densityPrimary) / densityMoon, 1 / 3)

// Fluid (deformable) bodies break up further out, because they stretch first.
export const rocheFluid = (Rprimary, densityPrimary, densityMoon) =>
  2.44 * Rprimary * Math.pow(densityPrimary / densityMoon, 1 / 3)

// Height of the equilibrium tidal bulge raised on a body of radius r.
export const bulgeHeight = (M, m, r, d) => (M / m) * Math.pow(r / d, 3) * r

// Self-gravity at a moon's surface, the thing tides have to beat.
export const surfaceGravity = (m, r) => (G * m) / (r * r)

// Mass of a uniform sphere.
export const massOf = (density, r) => density * (4 / 3) * Math.PI * Math.pow(r, 3)

// Is this moon inside its own Roche limit?
export const isDisrupted = (d, Rp, rhoP, rhoM) => d < rocheFluid(Rp, rhoP, rhoM)
