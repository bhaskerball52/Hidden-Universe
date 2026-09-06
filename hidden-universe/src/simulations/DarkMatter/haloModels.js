/**
 * Galaxy/halo helpers: NFW and pseudo-isothermal (cored) profiles.
 * Mass in M☉, radii in kpc, circular speed in km/s via G in galactic units.
 */

export const G_MSUN_KPC_KMS2 = 4.3009e-6 // kpc · (km/s)² / M☉ , G in galactic units

const MSUN_KG = 1.98847e30
const KPC_M = 3.085677581e19
/** (M☉ / kpc³) → kg / m³ */
export function rhoMsunKpc3ToKgM3(rhoMk) {
  return rhoMk * (MSUN_KG / KPC_M ** 3)
}

/** Earth volume ≈ 1.083e21 m³ (mean radius 6.371e6 m) */
const V_EARTH_M3 = (4 / 3) * Math.PI * (6.371e6) ** 3

/** kg/m³ → kg per Earth-volume (for plots like classroom sims) */
export function rhoKgM3ToPerEarthVol(rho) {
  return rho * V_EARTH_M3
}

export function vcircKms(MencMsun, rKpc) {
  const r = Math.max(rKpc, 1e-9)
  return Math.sqrt(G_MSUN_KPC_KMS2 * (MencMsun / r))
}

/** ρ_NFW(r) = ρ_s / ((r/r_s)(1+r/r_s)²), Msun/kpc³ */
export function rhoNfw(rKpc, rhoS, rsKpc) {
  const rs = Math.max(rsKpc, 1e-9)
  const x = rKpc / rs
  const denom = x * (1 + x) ** 2
  return denom > 1e-300 ? rhoS / denom : rhoS * 1e300
}

/** Spherically enclosed mass for NFW (truncated at r). Msun */
export function mencNfw(rKpc, rhoS, rsKpc) {
  const rs = Math.max(rsKpc, 1e-9)
  const x = rKpc / rs
  const lx = Math.log(1 + x)
  return 4 * Math.PI * rhoS * rs ** 3 * (lx - x / (1 + x))
}

/** ρ_iso(r) = ρ₀ / (1 + (r/r_c)²), Msun/kpc³ */
export function rhoPseudoIsothermal(rKpc, rho0, rcKpc) {
  const rc = Math.max(rcKpc, 1e-9)
  const x = rKpc / rc
  return rho0 / (1 + x * x)
}

export function mencPseudoIsothermal(rKpc, rho0, rcKpc) {
  const rc = Math.max(rcKpc, 1e-9)
  const x = rKpc / rc
  return 4 * Math.PI * rho0 * rc ** 3 * (x - Math.atan(x))
}

/** Rough empirical MW rotation curve for comparison (piecewise linear in kpc). */
const MW_ANCHORS = [
  [0.5, 118],
  [4, 228],
  [8, 233],
  [15, 238],
  [25, 220],
  [40, 200],
  [55, 175],
]

export function milkyWayVcircKms(rKpc) {
  const r = Math.max(rKpc, 0.25)
  if (r <= MW_ANCHORS[0][0]) return MW_ANCHORS[0][1]
  for (let i = 1; i < MW_ANCHORS.length; i++) {
    const [r0, v0] = MW_ANCHORS[i - 1]
    const [r1, v1] = MW_ANCHORS[i]
    if (r <= r1) {
      const t = (r - r0) / (r1 - r0)
      return v0 + t * (v1 - v0)
    }
  }
  const last = MW_ANCHORS[MW_ANCHORS.length - 1]
  return last[1]
}

/**
 * @param {'nfw'|'isothermal'} model
 * @param {object} p
 * @param {number} p.densityFactor scales characteristic density
 * @param {number} p.scaleRadiusKpc r_s (NFW) or r_c (pseudo-isothermal)
 * @param {number} p.velocityScale applied to √(GM/r) from halo (calibration / pedagogy)
 */
export function computeHaloSeries(model, p) {
  const {
    densityFactor = 1,
    scaleRadiusKpc = 15,
    velocityScale = 1,
    rMinKpc = 0.8,
    rMaxKpc = 45,
    nPoints = 56,
  } = p

  const rhoSNfwRef = 2.1e6 // Msun/kpc³, order-of-magnitude MW-like halo scale
  const rho0IsoRef = 9e6

  const rs = Math.max(scaleRadiusKpc, 0.5)
  const rhoS = rhoSNfwRef * densityFactor
  const rho0 = rho0IsoRef * densityFactor

  const rList = []
  const step = (Math.log(rMaxKpc) - Math.log(rMinKpc)) / (nPoints - 1)
  for (let i = 0; i < nPoints; i++) {
    rList.push(Math.exp(Math.log(rMinKpc) + step * i))
  }

  const rhoMsun = []
  const mencMsun = []
  const vcKms = []
  const rhoKgEarth = []
  const mwKms = []
  const vcBaryonKms = []

  // Baryonic disk parameters, peak scales with sqrt(mass), disk scale ~ 20% of halo scale
  const vBaryPeak = 185 * Math.sqrt(densityFactor)
  const rDisk = Math.max(rs * 0.22, 2.0)

  for (const rk of rList) {
    const rSafe = Math.max(rk, 0.05)
    let menc
    let rhoM
    if (model === 'nfw') {
      menc = mencNfw(rk, rhoS, rs)
      rhoM = rhoNfw(rSafe, rhoS, rs)
    } else {
      menc = mencPseudoIsothermal(rk, rho0, rs)
      rhoM = rhoPseudoIsothermal(rSafe, rho0, rs)
    }
    const rhoSi = rhoMsunKpc3ToKgM3(rhoM)
    rhoKgEarth.push(rhoKgM3ToPerEarthVol(rhoSi))
    rhoMsun.push(rhoM)
    mencMsun.push(menc)
    vcKms.push(vcircKms(menc, rk) * velocityScale)
    mwKms.push(milkyWayVcircKms(rk))
    // Baryonic-only rotation curve: geometric-mean formula peaks at r = rDisk, then declines
    vcBaryonKms.push(vBaryPeak * 2 * Math.sqrt(rk * rDisk) / (rk + rDisk))
  }

  const peakVc = vcKms.reduce((a, b) => Math.max(a, b), 0)
  const mencMax = mencMsun[mencMsun.length - 1]

  return {
    rKpc: rList,
    rhoMsunKpc3: rhoMsun,
    rhoKgPerEarthVol: rhoKgEarth,
    mencMsun,
    vcKms,
    vcBaryonKms,
    mwVcircKms: mwKms,
    peakVc,
    mencOuterMsun: mencMax,
    meta: { rhoS, rho0, rs, model },
  }
}

const C_KMS = 299792.458

/**
 * GR gravitational deflection angle (radians): α = 4GM/(c²b)
 * This is the Einstein factor-of-4 formula for light deflection.
 * @param {number} mencMsun  enclosed mass in solar masses
 * @param {number} bKpc      impact parameter in kpc
 */
export function grDeflectionAngleRad(mencMsun, bKpc) {
  const b = Math.max(bKpc, 0.5)
  return (4 * G_MSUN_KPC_KMS2 * mencMsun) / (C_KMS ** 2 * b)
}
