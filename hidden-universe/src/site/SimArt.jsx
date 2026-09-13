// Decorative SVG previews for the simulation cards. These are cheap, static
// vectors with CSS-driven motion, the real WebGL scenes only mount when a
// simulation is actually launched, so the homepage stays light.

const VB = '0 0 200 140'

// The card's art panel is wider than the viewBox, so crop rather than
// letterbox, every composition here is centred on (100, 70).
const FIT = 'xMidYMid slice'

// Two logarithmic spiral arms, sampled into dots that thin out with radius.
function spiralArm(offset, turns = 1.9, count = 46) {
  const pts = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const theta = offset + t * turns * Math.PI * 2
    const r = 4 + t * 62
    pts.push({
      x: 100 + r * Math.cos(theta),
      y: 70 + r * Math.sin(theta) * 0.42,
      r: 2.4 - t * 1.6,
      o: 0.9 - t * 0.55,
    })
  }
  return pts
}

function GalaxyArt() {
  const arms = [spiralArm(0), spiralArm(Math.PI)]
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <radialGradient id="hu-gal-halo" cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor="#ff4d6d" stopOpacity="0" />
          <stop offset="88%" stopColor="#ff4d6d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ff4d6d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hu-gal-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6f8" />
          <stop offset="55%" stopColor="#ff8fab" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ff4d6d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="88" ry="62" fill="url(#hu-gal-halo)" />
      <ellipse
        cx="100"
        cy="70"
        rx="80"
        ry="34"
        fill="none"
        stroke="#ff4d6d"
        strokeOpacity="0.16"
        strokeDasharray="3 7"
      />
      <g className="sim-art-spin">
        {arms.map((arm, ai) =>
          arm.map((p, i) => (
            <circle
              key={`${ai}-${i}`}
              cx={p.x}
              cy={p.y}
              r={Math.max(0.6, p.r)}
              fill={ai === 0 ? '#ffd6e0' : '#ff9fb8'}
              opacity={Math.max(0.15, p.o)}
            />
          ))
        )}
      </g>
      <ellipse cx="100" cy="70" rx="26" ry="18" fill="url(#hu-gal-core)" />
    </svg>
  )
}

function BlackHoleArt() {
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <linearGradient id="hu-bh-disk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="35%" stopColor="#ff7a3c" />
          <stop offset="70%" stopColor="#ef5a2a" />
          <stop offset="100%" stopColor="#7a2410" />
        </linearGradient>
        <radialGradient id="hu-bh-glow" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#ff7a3c" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ff7a3c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="70" r="58" fill="url(#hu-bh-glow)" opacity="0.35" />
      {/* far side of the disk, lensed up over the shadow */}
      <path
        d="M32 70 A68 46 0 0 1 168 70"
        fill="none"
        stroke="url(#hu-bh-disk)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* near side */}
      <ellipse
        cx="100"
        cy="70"
        rx="70"
        ry="17"
        fill="none"
        stroke="url(#hu-bh-disk)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="100" cy="70" r="26" fill="#03020a" />
      <circle
        cx="100"
        cy="70"
        r="27"
        fill="none"
        stroke="#ffcf9a"
        strokeWidth="1.6"
        className="sim-art-pulse"
      />
      <circle
        cx="100"
        cy="70"
        r="33"
        fill="none"
        stroke="#ff7a3c"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeDasharray="2 6"
      />
    </svg>
  )
}

function PulsarArt() {
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <linearGradient id="hu-ns-beam" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#aee0ff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#5aa9ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hu-ns-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#bfe6ff" />
          <stop offset="100%" stopColor="#2f7df0" />
        </radialGradient>
      </defs>
      <g className="sim-art-wobble" style={{ transformOrigin: '100px 70px' }}>
        <g transform="rotate(-24 100 70)">
          <path d="M100 70 L74 -6 L126 -6 Z" fill="url(#hu-ns-beam)" />
          <path d="M100 70 L74 146 L126 146 Z" fill="url(#hu-ns-beam)" opacity="0.55" />
        </g>
        {[26, 40, 54].map((r, i) => (
          <ellipse
            key={r}
            cx="100"
            cy="70"
            rx={r}
            ry={r * 0.72}
            fill="none"
            stroke="#5aa9ff"
            strokeOpacity={0.4 - i * 0.1}
            strokeWidth="1.1"
            transform="rotate(-24 100 70)"
          />
        ))}
      </g>
      <circle cx="100" cy="70" r="15" fill="url(#hu-ns-core)" />
      <circle cx="100" cy="70" r="21" fill="none" stroke="#aee0ff" strokeOpacity="0.3" />
    </svg>
  )
}

function WormholeArt() {
  const rings = [8, 14, 22, 32, 44, 58, 74]
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <radialGradient id="hu-wh-mouth" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eafaff" />
          <stop offset="40%" stopColor="#5fd0ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="52" ry="46" fill="url(#hu-wh-mouth)" opacity="0.45" />
      <g className="sim-art-drift">
        {rings.map((r, i) => (
          <ellipse
            key={r}
            cx="100"
            cy="70"
            rx={r}
            ry={r * (0.34 + i * 0.055)}
            fill="none"
            stroke={i < 3 ? '#b3f0ff' : '#5fd0ff'}
            strokeOpacity={0.7 - i * 0.075}
            strokeWidth={i < 2 ? 1.6 : 1.1}
          />
        ))}
      </g>
      <circle cx="100" cy="70" r="9" fill="none" stroke="#eafaff" strokeWidth="1.8" opacity="0.9" />
      <circle cx="100" cy="70" r="5" fill="#0a1a26" />
    </svg>
  )
}


// ── Art for the ten simulations added alongside the original four ───────────
// Same rules as above: cheap static vectors centred on (100, 70), no motion of
// their own, so the homepage stays light.

function OrbitArt() {
  const pts = []
  for (let i = 0; i <= 60; i++) {
    const nu = (i / 60) * Math.PI * 2
    const r = (58 * (1 - 0.36 * 0.36)) / (1 + 0.36 * Math.cos(nu))
    pts.push(`${124 + r * Math.cos(nu)},${70 + r * Math.sin(nu) * 0.52}`)
  }
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <radialGradient id="hu-orb-star" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6e0" />
          <stop offset="70%" stopColor="#ffb347" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a0 = (k / 6) * Math.PI * 2
        const a1 = ((k + 1) / 6) * Math.PI * 2
        const r0 = (58 * 0.87) / (1 + 0.36 * Math.cos(a0))
        const r1 = (58 * 0.87) / (1 + 0.36 * Math.cos(a1))
        return (
          <path key={k} opacity={k % 2 ? 0.16 : 0.09}
            d={`M124,70 L${124 + r0 * Math.cos(a0)},${70 + r0 * Math.sin(a0) * 0.52} A40,22 0 0 1 ${124 + r1 * Math.cos(a1)},${70 + r1 * Math.sin(a1) * 0.52} Z`}
            fill="#ffb347" />
        )
      })}
      <polyline points={pts.join(' ')} fill="none" stroke="#ffd7a0" strokeWidth="1.4" opacity="0.85" />
      <circle cx="124" cy="70" r="20" fill="url(#hu-orb-star)" />
      <circle cx="124" cy="70" r="7" fill="#fff3d0" />
      <circle cx="48" cy="70" r="4.6" fill="#cfe6ff" />
      <line x1="124" y1="70" x2="48" y2="70" stroke="#ffd7a0" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

function BeltArt() {
  const rocks = []
  let seed = 7
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  for (let i = 0; i < 150; i++) {
    const a = rnd() * Math.PI * 2
    let r = 36 + rnd() * 44
    // Leave the Kirkwood gaps empty, which is the point of the scene.
    for (const g of [52, 63, 74]) if (Math.abs(r - g) < 3.4) r += 8
    rocks.push({ x: 100 + r * Math.cos(a), y: 70 + r * Math.sin(a) * 0.42, s: 0.7 + rnd() * 1.5 })
  }
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <circle cx="100" cy="70" r="8" fill="#fff0c8" />
      {rocks.map((r, i) => <circle key={i} cx={r.x} cy={r.y} r={r.s} fill="#c9a36a" opacity={0.8} />)}
      <circle cx="178" cy="70" r="5.5" fill="#e8c49a" />
      <ellipse cx="100" cy="70" rx="78" ry="33" fill="none" stroke="#c9a36a" strokeWidth="0.7" opacity="0.25" />
    </svg>
  )
}

function TransitArt() {
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <radialGradient id="hu-tr-star" cx="42%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="62%" stopColor="#f6e2a6" />
          <stop offset="100%" stopColor="#c9a253" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="52" r="34" fill="url(#hu-tr-star)" />
      <circle cx="112" cy="48" r="7.5" fill="#0a0d16" />
      <path d="M18,108 H74 Q80,108 84,116 T100,120 T116,116 Q120,108 126,108 H182"
        fill="none" stroke="#6ee7b7" strokeWidth="2.2" />
      <line x1="18" y1="108" x2="182" y2="108" stroke="#6ee7b7" strokeWidth="0.6" opacity="0.3" strokeDasharray="3 4" />
    </svg>
  )
}

function LensArt() {
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <radialGradient id="hu-lens-core" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#0a0716" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      {[26, 33, 40].map((r, i) => (
        <circle key={r} cx="100" cy="70" r={r} fill="none" stroke="#d0c2ff"
          strokeWidth={i === 0 ? 2.4 : 1} opacity={i === 0 ? 0.9 : 0.3} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
        const a = (k / 8) * Math.PI * 2
        return (
          <ellipse key={k} cx={100 + 30 * Math.cos(a)} cy={70 + 30 * Math.sin(a)}
            rx="9" ry="3" fill="#e8e0ff" opacity="0.55"
            transform={`rotate(${(a * 180) / Math.PI + 90} ${100 + 30 * Math.cos(a)} ${70 + 30 * Math.sin(a)})`} />
        )
      })}
      <circle cx="100" cy="70" r="26" fill="url(#hu-lens-core)" />
      {[[36, 24], [160, 30], [44, 116], [168, 108], [22, 66]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="#cdbcff" opacity="0.75" />
      ))}
    </svg>
  )
}

function AberrationArt() {
  const rays = []
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2
    const bias = 1 - 0.72 * Math.cos(a)          // crowd toward the direction of travel
    const r = 20 + 58 / bias
    rays.push({ x: 100 + Math.min(r, 96) * Math.cos(a), y: 70 + Math.min(r, 70) * Math.sin(a), a })
  }
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      {rays.map((p, i) => (
        <line key={i} x1={p.x} y1={p.y}
          x2={p.x + 7 * Math.cos(p.a)} y2={p.y + 7 * Math.sin(p.a)}
          stroke={p.x > 100 ? '#9fd0ff' : '#ff9fb0'} strokeWidth="1.5"
          opacity={p.x > 100 ? 0.85 : 0.35} strokeLinecap="round" />
      ))}
      <circle cx="100" cy="70" r="4" fill="#fff" opacity="0.9" />
      <path d="M150,70 l-14,-8 v16 z" fill="#60a5fa" opacity="0.8" />
    </svg>
  )
}

function HRArt() {
  const ms = []
  for (let i = 0; i <= 30; i++) {
    const t = i / 30
    ms.push(`${26 + t * 150},${124 - t * 96}`)
  }
  let seed = 3
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const scatter = []
  for (let i = 0; i < 90; i++) {
    const t = rnd()
    scatter.push({ x: 26 + t * 150 + (rnd() - 0.5) * 10, y: 124 - t * 96 + (rnd() - 0.5) * 10, t })
  }
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <polyline points={ms.join(' ')} fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.35" />
      {scatter.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r="1.7"
          fill={s.t > 0.66 ? '#bcd8ff' : s.t > 0.33 ? '#fff4d6' : '#ffb59f'} opacity="0.85" />
      ))}
      {[[44, 34], [58, 28], [70, 38], [52, 44]].map(([x, y], i) => (
        <circle key={`g${i}`} cx={x + 74} cy={y} r="3.4" fill="#ff9f7a" opacity="0.9" />
      ))}
      {[[40, 104], [52, 112], [62, 100]].map(([x, y], i) => (
        <circle key={`w${i}`} cx={x} cy={y} r="1.8" fill="#dbeafe" opacity="0.9" />
      ))}
    </svg>
  )
}

function ExpansionArt() {
  const dots = []
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const d = Math.hypot(i, j)
      dots.push({ x: 100 + i * 30, y: 70 + j * 24, d })
    }
  }
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      {[-2, -1, 0, 1, 2].map((i) => (
        <g key={i} opacity="0.16">
          <line x1={100 + i * 30} y1="10" x2={100 + i * 30} y2="130" stroke="#f472b6" strokeWidth="0.8" />
          <line x1="10" y1={70 + i * 24} x2="190" y2={70 + i * 24} stroke="#f472b6" strokeWidth="0.8" />
        </g>
      ))}
      {dots.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.d === 0 ? 4 : 3}
            fill={p.d === 0 ? '#ffffff' : p.d > 1.9 ? '#fb7185' : p.d > 1.1 ? '#f9a8d4' : '#c4b5fd'} />
          {p.d > 0 && (
            <line x1={p.x} y1={p.y}
              x2={p.x + (p.x - 100) * 0.14} y2={p.y + (p.y - 70) * 0.14}
              stroke="#f472b6" strokeWidth="1.2" opacity="0.65" />
          )}
        </g>
      ))}
    </svg>
  )
}

function TidesArt() {
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <ellipse cx="82" cy="70" rx="40" ry="30" fill="#38bdf8" opacity="0.3" />
      <circle cx="82" cy="70" r="29" fill="#2b4a6b" />
      <ellipse cx="82" cy="70" rx="40" ry="30" fill="none" stroke="#7dd3fc" strokeWidth="1.4" opacity="0.8" />
      <circle cx="168" cy="70" r="8" fill="#e2e8f0" />
      {[0, 1, 2, 3, 4].map((k) => (
        <circle key={k} cx={152 + k * 9} cy={70 + (k - 2) * 3} r="1.6" fill="#dbeafe" opacity="0.7" />
      ))}
      <circle cx="82" cy="70" r="52" fill="none" stroke="#f87171" strokeWidth="1" opacity="0.5" strokeDasharray="4 5" />
    </svg>
  )
}

function SpectrumArt() {
  const curve = []
  for (let i = 0; i <= 60; i++) {
    const x = 18 + (i / 60) * 164
    const u = (i / 60) * 5.2
    // u³/(eᵘ−1) → 0 as u → 0; evaluating it at 0 directly gives 0/0.
    const v = u === 0 ? 0 : Math.pow(u, 3) / Math.expm1(u)
    curve.push(`${x},${126 - v * 62}`)
  }
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <defs>
        <linearGradient id="hu-spec-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="25%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="72%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <rect x="18" y="118" width="164" height="12" fill="url(#hu-spec-band)" opacity="0.75" />
      {[52, 74, 96, 118, 140].map((x) => (
        <rect key={x} x={x} y="118" width="2.4" height="12" fill="#0a0d16" opacity="0.85" />
      ))}
      <polyline points={curve.join(' ')} fill="none" stroke="#fb7185" strokeWidth="2.2" />
      <polyline points={curve.join(' ')} fill="#fb7185" opacity="0.14"
        style={{ transform: 'translateY(0px)' }} />
    </svg>
  )
}

function BinaryArt() {
  return (
    <svg viewBox={VB} className="sim-art-svg" preserveAspectRatio={FIT} aria-hidden="true">
      <ellipse cx="100" cy="58" rx="46" ry="17" fill="none" stroke="#f59e0b" strokeWidth="0.9" opacity="0.3" />
      <ellipse cx="100" cy="58" rx="26" ry="10" fill="none" stroke="#f59e0b" strokeWidth="0.9" opacity="0.3" />
      <circle cx="74" cy="58" r="16" fill="#ffd9a0" />
      <circle cx="140" cy="58" r="9" fill="#9fc6ff" />
      <circle cx="100" cy="58" r="2" fill="#fff" opacity="0.6" />
      <path d="M18,118 H56 L64,128 L72,118 H112 L120,124 L128,118 H182"
        fill="none" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  )
}

const ART = {
  galaxy: GalaxyArt,
  blackhole: BlackHoleArt,
  pulsar: PulsarArt,
  wormhole: WormholeArt,
  orbit: OrbitArt,
  belt: BeltArt,
  transit: TransitArt,
  lens: LensArt,
  aberration: AberrationArt,
  hr: HRArt,
  expansion: ExpansionArt,
  tides: TidesArt,
  spectrum: SpectrumArt,
  binary: BinaryArt,
}

export default function SimArt({ kind }) {
  const Cmp = ART[kind]
  return Cmp ? <Cmp /> : null
}
