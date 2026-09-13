// Expansion kinematics. Pure, unit-tested in CosmicExpansion.check.mjs.
// Distances are comoving unless stated; the scale factor a converts to proper.

export const H0 = 70 // km/s/Mpc

// Proper distance is comoving distance times the scale factor. This is the whole
// idea: the galaxies do not move through space, the space between them grows.
export const properDistance = (comoving, a) => comoving * a

// Hubble's law. Recession speed is proportional to distance, with no centre:
// every observer sees the same law, which the scene lets you check directly.
export const recessionSpeed = (properDist, H = H0) => H * properDist

// Cosmological redshift comes from the ratio of scale factors between emission
// and observation, not from a Doppler shift through space.
export const redshiftFrom = (aEmit, aNow = 1) => aNow / aEmit - 1
export const scaleFromRedshift = (z) => 1 / (1 + z)

// Hubble time: the age of a universe that had always expanded at today's rate.
// 1/H0 with H0 in km/s/Mpc, converted to Gyr.
export const hubbleTimeGyr = (H = H0) => 977.8 / H

// The distance at which recession reaches the speed of light. Galaxies beyond
// it are receding faster than light, which general relativity permits because
// it is space expanding rather than motion through space.
export const hubbleRadiusMpc = (H = H0) => 299792.458 / H

// Matter-dominated growth, a ∝ t^(2/3), normalised so a = 1 at t = 1.
export const scaleAt = (t) => Math.pow(Math.max(t, 1e-6), 2 / 3)

// Hubble parameter at time t for the same matter-dominated model. With
// a = t^(2/3), H = (da/dt)/a = 2/(3t); normalising H(1) = H0 gives H0/t. The
// "constant" falls with time, which is why the Hubble diagram flattens.
export const hubbleAt = (t, H = H0) => H / Math.max(t, 1e-6)
