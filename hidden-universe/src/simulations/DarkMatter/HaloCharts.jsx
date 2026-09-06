function formatSci(n) {
  if (!Number.isFinite(n) || n === 0) return '0'
  const exp = Math.floor(Math.log10(Math.abs(n)))
  const mant = n / 10 ** exp
  return `${mant.toFixed(2)}e${exp >= 0 ? '+' : ''}${exp}`
}

function formatMass(n) {
  if (!Number.isFinite(n)) return 'n/a'
  if (n >= 1e10) return `${(n / 1e10).toFixed(2)}×10¹⁰`
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}×10⁹`
  return n.toExponential(2)
}

function kpcToKiloLy(kpc) {
  return kpc * 3.261563777
}

export function HaloCharts({ series }) {
  const W = 340
  const H = 140
  const pad = { l: 48, r: 16, t: 20, b: 28 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  const { rKpc, rhoKgPerEarthVol, vcKms, mencMsun, mwVcircKms } = series
  if (!rKpc?.length) return null

  const rLy = rKpc.map(kpcToKiloLy)
  const xMin = rLy[0]
  const xMax = rLy[rLy.length - 1]
  const ix = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * innerW

  const rhoPos = rhoKgPerEarthVol.map((v) => Math.max(v, 1e-80))
  const logMin = Math.floor(Math.log10(Math.min(...rhoPos)))
  const logMax = Math.ceil(Math.log10(Math.max(...rhoPos)))
  const lr = logMax - logMin || 1
  const yLog = (rho) => pad.t + (1 - (Math.log10(Math.max(rho, 1e-80)) - logMin) / lr) * innerH

  const vMax = Math.max(...vcKms, ...mwVcircKms, 80) * 1.08
  const yLin = (v) => pad.t + (1 - v / vMax) * innerH

  const mMax = Math.max(...mencMsun) * 1.02
  const mMin = Math.min(...mencMsun) * 0.98
  const yM = (m) => pad.t + (1 - (m - mMin) / (mMax - mMin || 1)) * innerH

  const clamp = (y) => Math.max(pad.t, Math.min(pad.t + innerH, y))

  const linePoints = (ys, yFn) =>
    ys.map((y, i) => `${ix(rLy[i]).toFixed(1)},${clamp(yFn(y)).toFixed(1)}`).join(' ')

  const mwLine = mwVcircKms
    .map((y, i) => `${ix(rLy[i]).toFixed(1)},${clamp(yLin(y)).toFixed(1)}`)
    .join(' ')

  return (
    <div className="halo-charts">
      <div className="halo-chart-block">
        <div className="halo-chart-title">Dark matter density (kg / Earth volume)</div>
        <svg className="halo-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <clipPath id="clip-d">
              <rect x={pad.l} y={pad.t} width={innerW} height={innerH} />
            </clipPath>
          </defs>
          <line className="halo-chart-axis" x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} />
          <line className="halo-chart-axis" x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} />
          <g clipPath="url(#clip-d)">
            <polyline
              className="halo-chart-fill-log"
              points={`${pad.l},${pad.t + innerH} ${linePoints(rhoPos, yLog)} ${pad.l + innerW},${pad.t + innerH}`}
            />
            <polyline className="halo-chart-line halo-chart-line-sim" points={linePoints(rhoPos, yLog)} />
          </g>
          <text className="halo-chart-y-tick" x={pad.l - 4} y={pad.t - 2} textAnchor="end">
            {formatSci(rhoPos[0])}
          </text>
          <text className="halo-chart-y-tick" x={pad.l - 4} y={pad.t + innerH} textAnchor="end">
            {formatSci(rhoPos[rhoPos.length - 1])}
          </text>
        </svg>
        <div className="halo-chart-xlabel">Radius (1000 light-years)</div>
      </div>

      <div className="halo-chart-block">
        <div className="halo-chart-title">Orbital velocity (km/s)</div>
        <svg className="halo-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <clipPath id="clip-v">
              <rect x={pad.l} y={pad.t} width={innerW} height={innerH} />
            </clipPath>
          </defs>
          <line className="halo-chart-axis" x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} />
          <line className="halo-chart-axis" x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} />
          <g clipPath="url(#clip-v)">
            <polyline className="halo-chart-line halo-chart-line-mw" points={mwLine} />
            <polyline className="halo-chart-line halo-chart-line-sim" points={linePoints(vcKms, yLin)} />
          </g>
          <text className="halo-chart-y-tick" x={pad.l - 4} y={pad.t - 2} textAnchor="end">{Math.round(vMax)}</text>
          <text className="halo-chart-y-tick" x={pad.l - 4} y={pad.t + innerH} textAnchor="end">0</text>
        </svg>
        <div className="halo-chart-legend-row">
          <span className="halo-chart-legend-dash halo-chart-legend-dash-mw" />
          <span className="halo-chart-legend-text-mw">Milky Way (reference)</span>
          <span className="halo-chart-legend-dash halo-chart-legend-dash-sim" />
          <span className="halo-chart-legend-text-sim">Model</span>
        </div>
        <div className="halo-chart-xlabel">Radius (1000 light-years)</div>
      </div>

      <div className="halo-chart-block">
        <div className="halo-chart-title">Total mass enclosed (M☉)</div>
        <svg className="halo-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <clipPath id="clip-m">
              <rect x={pad.l} y={pad.t} width={innerW} height={innerH} />
            </clipPath>
          </defs>
          <line className="halo-chart-axis" x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} />
          <line className="halo-chart-axis" x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} />
          <g clipPath="url(#clip-m)">
            <polyline
              className="halo-chart-fill-m"
              points={`${pad.l},${pad.t + innerH} ${linePoints(mencMsun, yM)} ${pad.l + innerW},${pad.t + innerH}`}
            />
            <polyline className="halo-chart-line halo-chart-line-sim" points={linePoints(mencMsun, yM)} />
          </g>
          <text className="halo-chart-y-tick" x={pad.l - 4} y={pad.t - 2} textAnchor="end">
            {formatMass(mencMsun[mencMsun.length - 1])}
          </text>
          <text className="halo-chart-y-tick" x={pad.l - 4} y={pad.t + innerH} textAnchor="end">
            {formatMass(mencMsun[0])}
          </text>
        </svg>
        <div className="halo-chart-xlabel">Radius (1000 light-years)</div>
      </div>
    </div>
  )
}