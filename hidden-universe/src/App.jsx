import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import Home from './site/Home'
import { SIMULATIONS, SITE } from './site/siteData'

// Lazily loaded so the hub doesn't ship three.js, drei and four WebGL scenes to
// someone who only came to read the resource list. Each simulation becomes its
// own chunk, fetched the moment it's launched.
const COMPONENTS = {
  darkMatter: lazy(() => import('./simulations/DarkMatter/Galaxy')),
  blackHole: lazy(() => import('./simulations/BlackHole/BlackHole')),
  neutronStar: lazy(() => import('./simulations/NeutronStar/NeutronStar')),
  wormhole: lazy(() => import('./simulations/Wormhole/Wormhole')),
}

const SLUG_BY_KEY = Object.fromEntries(SIMULATIONS.map((s) => [s.key, s.route]))
const KEY_BY_SLUG = Object.fromEntries(SIMULATIONS.map((s) => [s.route, s.key]))
const SIM_BY_KEY = Object.fromEntries(SIMULATIONS.map((s) => [s.key, s]))

// Hash routing keeps deep links to individual simulations shareable, which
// matters when a social post points straight at one, without pulling in a
// router dependency or needing server-side rewrites on a static host.
function readHash() {
  const slug = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return KEY_BY_SLUG[slug] ?? 'home'
}

function SimLoading({ sim }) {
  return (
    <div className="sim-loading" style={{ '--sim-accent': sim?.accent ?? '#ff4d6d' }}>
      <div className="sim-loading-orb" />
      <p className="sim-loading-name">{sim?.name ?? 'Simulation'}</p>
      <p className="sim-loading-note">Compiling shaders…</p>
    </div>
  )
}

export default function App() {
  const [sim, setSim] = useState(readHash)

  // Follow the browser's back/forward buttons.
  useEffect(() => {
    const onHashChange = () => setSim(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Simulations run full-bleed with the page scroll locked; the hub scrolls.
  // Both are driven off this attribute so the two stylesheets can't fight.
  useEffect(() => {
    document.body.dataset.mode = sim === 'home' ? 'home' : 'sim'
    document.title =
      sim === 'home'
        ? `${SITE.name}, Interactive Astrophysics`
        : `${SIM_BY_KEY[sim].name} · ${SITE.name}`
  }, [sim])

  const go = useCallback((next) => {
    const slug = SLUG_BY_KEY[next]
    window.location.hash = slug ? `/${slug}` : '/'
    setSim(slug ? next : 'home')
    window.scrollTo(0, 0)
  }, [])

  if (sim === 'home') return <Home onLaunch={go} />

  const Sim = COMPONENTS[sim]
  return (
    <Suspense fallback={<SimLoading sim={SIM_BY_KEY[sim]} />}>
      <Sim onSwitchSim={go} />
    </Suspense>
  )
}
