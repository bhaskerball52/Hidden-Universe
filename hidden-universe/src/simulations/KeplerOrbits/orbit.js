// Two-body orbit mathematics. No React, no three.js, so it can be unit-tested:
// see KeplerOrbits.check.mjs.
//
// Units are scaled so GM = 1 and a = 1 gives a period of 2π. That keeps the
// numbers readable on screen while the relationships stay exact.

export const GM = 1

// Kepler's equation M = E - e·sin E, solved for E by Newton-Raphson.
// Converges in a handful of iterations for every e < 1 we allow.
export function eccentricAnomaly(M, e, tol = 1e-10, maxIter = 40) {
  let x = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
  // Starting guess: for high eccentricity plain M converges slowly.
  let E = e < 0.8 ? x : Math.PI * Math.sign(x || 1)
  for (let i = 0; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - x
    const fp = 1 - e * Math.cos(E)
    const d = f / fp
    E -= d
    if (Math.abs(d) < tol) break
  }
  return E
}

// True anomaly from eccentric anomaly.
export const trueAnomaly = (E, e) =>
  2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))

// Orbit radius from the focus at true anomaly nu.
export const radiusAt = (a, e, nu) => (a * (1 - e * e)) / (1 + e * Math.cos(nu))

// Orbital period. Kepler's third law: depends on a alone, never on e.
export const period = (a) => 2 * Math.PI * Math.sqrt((a * a * a) / GM)

// Vis-viva: speed at radius r on an orbit of semi-major axis a.
export const speedAt = (r, a) => Math.sqrt(GM * (2 / r - 1 / a))

export const perihelion = (a, e) => a * (1 - e)
export const aphelion = (a, e) => a * (1 + e)

// Specific angular momentum, constant around the orbit. This is what makes the
// second law true: dA/dt = h/2.
export const angularMomentum = (a, e) => Math.sqrt(GM * a * (1 - e * e))

// Position in the orbital plane at time t (seconds since perihelion).
export function stateAt(t, a, e) {
  const n = Math.sqrt(GM / (a * a * a)) // mean motion
  const M = n * t
  const E = eccentricAnomaly(M, e)
  const nu = trueAnomaly(E, e)
  const r = radiusAt(a, e, nu)
  return { r, nu, x: r * Math.cos(nu), y: r * Math.sin(nu), speed: speedAt(r, a) }
}

// Area swept between two true anomalies, by the standard ellipse-sector formula
// integrated from the focus. Used to show equal areas in equal times.
export function sweptArea(a, e, nu0, nu1) {
  const F = (nu) => {
    const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2))
    return 0.5 * a * a * Math.sqrt(1 - e * e) * (E - e * Math.sin(E))
  }
  return F(nu1) - F(nu0)
}
