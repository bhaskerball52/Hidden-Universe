// Special relativity for an observer moving through a star field.
// Pure, unit-tested in RelativisticFlight.check.mjs.

export const lorentzGamma = (beta) => 1 / Math.sqrt(1 - beta * beta)

// Relativistic aberration. An angle theta measured in the rest frame appears at
// theta' when you are moving at beta toward theta = 0. Stars crowd forward.
export function aberrate(cosTheta, beta) {
  return (cosTheta + beta) / (1 + beta * cosTheta)
}

// The inverse: where a star seen at cosTheta' actually sits in the rest frame.
export const deaberrate = (cosThetaPrime, beta) =>
  (cosThetaPrime - beta) / (1 - beta * cosThetaPrime)

// Relativistic Doppler factor. Combines the classical shift with time dilation,
// so even light arriving from exactly sideways is redshifted.
export const dopplerFactor = (cosTheta, beta) =>
  1 / (lorentzGamma(beta) * (1 - beta * cosTheta))

// Observed wavelength.
export const observedWavelength = (lambda0, cosTheta, beta) =>
  lambda0 / dopplerFactor(cosTheta, beta)

// Headlight (beaming) effect. Specific intensity transforms as the fourth power
// of the Doppler factor, so what is ahead becomes overwhelmingly bright.
export const beaming = (cosTheta, beta) => Math.pow(dopplerFactor(cosTheta, beta), 4)

// Half-angle containing most of the forward light, the "headlight cone".
export const headlightAngle = (beta) => Math.asin(1 / lorentzGamma(beta))

// Time dilation and length contraction.
export const properTime = (coordTime, beta) => coordTime / lorentzGamma(beta)
export const contractedLength = (restLength, beta) => restLength / lorentzGamma(beta)

// Kinetic energy in units of mc^2.
export const kineticEnergy = (beta) => lorentzGamma(beta) - 1
