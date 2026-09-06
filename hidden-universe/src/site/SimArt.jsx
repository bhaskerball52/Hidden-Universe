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

const ART = {
  galaxy: GalaxyArt,
  blackhole: BlackHoleArt,
  pulsar: PulsarArt,
  wormhole: WormholeArt,
}

export default function SimArt({ kind }) {
  const Cmp = ART[kind]
  return Cmp ? <Cmp /> : null
}
