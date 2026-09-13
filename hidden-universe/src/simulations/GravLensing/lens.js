// Point-mass gravitational lensing. Pure, unit-tested in GravLensing.check.mjs.
//
// Angles are in units of the Einstein radius, which makes every formula clean:
// thetaE = 1, and the lens equation is beta = theta - 1/theta.

// The two images of a source at angular offset beta from the lens.
// Solving beta = theta - 1/theta gives a quadratic in theta.
export function images(beta) {
  const root = Math.sqrt(beta * beta + 4)
  return { plus: (beta + root) / 2, minus: (beta - root) / 2 }
}

// Magnification of each image. Negative parity on the inner image is physical:
// it is mirror-reversed, and the observable is the absolute value.
export const magnification = (theta) => 1 / (1 - Math.pow(1 / theta, 4))

// Total observable magnification, the sum of both images' absolute values.
export function totalMagnification(beta) {
  const u = Math.abs(beta)
  if (u < 1e-9) return Infinity
  return (u * u + 2) / (u * Math.sqrt(u * u + 4))
}

// Einstein radius in radians for a point mass. 4GM/c^2 with the distance ratio.
// G=6.674e-11, c=2.998e8, all SI.
export function einsteinRadius(massKg, dL, dS) {
  const G = 6.674e-11, c = 2.998e8
  const dLS = dS - dL
  return Math.sqrt((4 * G * massKg * dLS) / (c * c * dL * dS))
}

// Where a ray arriving at image position theta came from on the source plane.
// This is what the shader evaluates per pixel: given the direction you look,
// find the point of sky it actually shows.
export const sourceOf = (theta) => theta - 1 / theta

// Same, in two dimensions. The deflection is radial, so only the radius changes.
export function sourcePos(x, y) {
  const r2 = x * x + y * y
  if (r2 < 1e-12) return { x: 0, y: 0, r: 0 }
  const f = 1 - 1 / r2   // radial scaling from beta = theta - thetaE^2/theta
  return { x: x * f, y: y * f, r: Math.sqrt(r2) }
}
