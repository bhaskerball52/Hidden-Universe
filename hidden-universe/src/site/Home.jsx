import { useMemo, useState } from 'react'
import {
  SITE,
  SIMULATIONS,
  SOCIALS,
  RESOURCES,
  RESOURCE_CATEGORIES,
  PATH,
} from './siteData'
import SimArt from './SimArt'
import TopicFinder from './TopicFinder'
import Starfield from './Starfield'
import { useIntro } from './useIntro'
import { ArrowIcon, ExternalIcon, GitHubIcon, LogoMark, SocialIcon } from './Icons'
import './Home.css'

function NavBar({ onLaunch }) {
  return (
    <header className="hu-nav">
      <a className="hu-nav-brand" href="#top">
        <LogoMark />
        <span>{SITE.name}</span>
      </a>
      <nav className="hu-nav-links">
        <a href="#simulations">Simulations</a>
        <a href="#path">Start here</a>
        <a href="#learn">Resources</a>
        <a href="#follow">Follow</a>
      </nav>
      <div className="hu-nav-actions">
        <a
          className="hu-nav-icon"
          href={SITE.repo}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Source on GitHub"
        >
          <GitHubIcon />
        </a>
        <button type="button" className="hu-btn hu-btn-primary hu-btn-sm" onClick={() => onLaunch('darkMatter')}>
          Launch a sim
          <ArrowIcon />
        </button>
      </div>
    </header>
  )
}

function Hero({ onLaunch, burstAt }) {
  return (
    <section className="hu-hero" id="top">
      <div className="hu-intro-black" />
      <Starfield burstAt={burstAt} />
      <div className="hu-hero-veil" />
      <div className="hu-hero-inner">
        <span className="hu-eyebrow hu-stage hu-stage-1">Interactive astrophysics · built on the real equations</span>
        <h1 className="hu-hero-title hu-title-in">
          Learn the <em data-glow="Hidden Universe">Hidden Universe</em>
        </h1>
        <p className="hu-hero-sub hu-stage hu-stage-2">{SITE.blurb}</p>
        <div className="hu-hero-cta hu-stage hu-stage-3">
          <button type="button" className="hu-btn hu-btn-primary" onClick={() => onLaunch('blackHole')}>
            Fall into a black hole
            <ArrowIcon />
          </button>
          <a className="hu-btn hu-btn-ghost" href="#learn">
            Browse the resource library
          </a>
        </div>
        <dl className="hu-stats hu-stage hu-stage-4">
          <div>
            <dt>{SIMULATIONS.length}</dt>
            <dd>WebGL simulations</dd>
          </div>
          <div>
            <dt>{RESOURCES.length}</dt>
            <dd>Curated resources</dd>
          </div>
          <div>
            <dt>100%</dt>
            <dd>Free &amp; open source</dd>
          </div>
        </dl>
      </div>
      <a className="hu-scroll-hint hu-stage hu-stage-5" href="#simulations" aria-label="Scroll to simulations">
        <span />
      </a>
    </section>
  )
}

function SimCard({ sim, onLaunch }) {
  const style = { '--sim-accent': sim.accent, '--sim-accent-soft': sim.accentSoft }
  return (
    <article className="hu-sim-card" style={style}>
      <div className="hu-sim-art">
        <SimArt kind={sim.art} />
        <span className="hu-sim-level">{sim.level}</span>
      </div>
      <div className="hu-sim-body">
        <span className="hu-sim-kicker">{sim.kicker}</span>
        <h3 className="hu-sim-name">{sim.name}</h3>
        <p className="hu-sim-summary">{sim.summary}</p>
        <ul className="hu-sim-features">
          {sim.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="hu-chips">
          {sim.concepts.map((c) => (
            <span className="hu-chip" key={c}>
              {c}
            </span>
          ))}
        </div>
        <button type="button" className="hu-btn hu-btn-sim" onClick={() => onLaunch(sim.key)}>
          Launch simulation
          <ArrowIcon />
        </button>
      </div>
    </article>
  )
}

function Simulations({ onLaunch }) {
  return (
    <section className="hu-section" id="simulations">
      <div className="hu-section-head">
        <span className="hu-eyebrow">The simulations</span>
        <h2>High-quality simulations, driven by physics and data</h2>
        <p>
          Every scene integrates the real equations live in the browser — geodesics, density
          profiles, dipole fields — against measured values, not artist impressions. Watching a
          disk warp over an event horizon, or a rotation curve refuse to fall off, gives you a feel
          for what is actually going on that no derivation on paper quite delivers.
        </p>
      </div>
      <div className="hu-sim-grid">
        {SIMULATIONS.map((sim) => (
          <SimCard key={sim.key} sim={sim} onLaunch={onLaunch} />
        ))}
      </div>
    </section>
  )
}

function LearningPath() {
  return (
    <section className="hu-section hu-section-tight" id="path">
      <div className="hu-section-head">
        <span className="hu-eyebrow">Start here</span>
        <h2>A route for learning</h2>
        <p>
          You do not need a degree to follow this field, but you do need an order. Three stages,
          each with the resources below filtered down to what actually matters at that point.
        </p>
      </div>
      <ol className="hu-path">
        {PATH.map((stage) => (
          <li className="hu-path-step" key={stage.step} style={{ '--sim-accent': stage.accent }}>
            <span className="hu-path-num">{stage.step}</span>
            <h3>{stage.title}</h3>
            <p>{stage.blurb}</p>
            <div className="hu-chips">
              {stage.picks.map((p) => (
                <span className="hu-chip" key={p}>
                  {p}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ResourceCard({ item }) {
  return (
    <a className="hu-res-card" href={item.url} target="_blank" rel="noreferrer noopener">
      <div className="hu-res-top">
        <span className={`hu-res-badge hu-res-badge-${item.category}`}>
          {RESOURCE_CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category}
        </span>
        <span className="hu-res-ext">
          <ExternalIcon />
        </span>
      </div>
      <h3 className="hu-res-title">{item.title}</h3>
      <span className="hu-res-source">{item.source}</span>
      <p className="hu-res-blurb">{item.blurb}</p>
      <div className="hu-res-foot">
        <span className="hu-chip hu-chip-quiet">{item.level}</span>
        {item.free ? <span className="hu-chip hu-chip-free">Free</span> : null}
      </div>
    </a>
  )
}

const RESOURCE_PAGE = 6

function Learn({ onLaunch }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [shownCount, setShownCount] = useState(RESOURCE_PAGE)

  const counts = useMemo(() => {
    const map = { all: RESOURCES.length }
    for (const r of RESOURCES) map[r.category] = (map[r.category] ?? 0) + 1
    return map
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return RESOURCES.filter((r) => {
      if (filter !== 'all' && r.category !== filter) return false
      if (!q) return true
      return `${r.title} ${r.source} ${r.blurb} ${r.level}`.toLowerCase().includes(q)
    })
  }, [filter, query])

  // Collapse back to one page whenever the result set changes, so a narrowed
  // filter never inherits an expanded count from the previous one.
  const visible = shown.slice(0, shownCount)
  const remaining = shown.length - visible.length

  return (
    <section className="hu-section" id="learn">
      <div className="hu-section-head">
        <span className="hu-eyebrow">Learning resources</span>
        <h2>Where to actually learn</h2>
        <p>
          Start by naming what you are after — a topic, or a competition you are preparing for —
          and get a route and the specific links for it. The full library is underneath if you
          would rather browse.
        </p>
      </div>

      <TopicFinder onLaunch={onLaunch} />

      <div className="hu-browse-head">
        <h3>Or browse everything</h3>
        <p>{RESOURCES.length} hand-picked courses, notes, tools and archives.</p>
      </div>

      <div className="hu-res-controls">
        <div className="hu-filters" role="tablist" aria-label="Resource categories">
          {RESOURCE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={filter === c.id}
              className={`hu-filter${filter === c.id ? ' hu-filter-active' : ''}`}
              onClick={() => {
                setFilter(c.id)
                setShownCount(RESOURCE_PAGE)
              }}
            >
              {c.label}
              <span className="hu-filter-count">{counts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <input
          className="hu-search"
          type="search"
          value={query}
          placeholder="Search resources…"
          aria-label="Search resources"
          onChange={(e) => {
            setQuery(e.target.value)
            setShownCount(RESOURCE_PAGE)
          }}
        />
      </div>

      {shown.length ? (
        <>
          <div className="hu-res-grid">
            {visible.map((r) => (
              <ResourceCard key={r.url} item={r} />
            ))}
          </div>
          {remaining > 0 ? (
            <div className="hu-more">
              <button
                type="button"
                className="hu-btn hu-btn-ghost"
                onClick={() => setShownCount((n) => n + RESOURCE_PAGE)}
              >
                Load {Math.min(RESOURCE_PAGE, remaining)} more
              </button>
              <span className="hu-more-count">
                Showing {visible.length} of {shown.length}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <p className="hu-empty">Nothing matches “{query}”. Try a broader term.</p>
      )}
    </section>
  )
}

function Follow() {
  return (
    <section className="hu-section" id="follow">
      <div className="hu-section-head">
        <span className="hu-eyebrow">Follow along</span>
        <h2>The same physics, in shorter form</h2>
      </div>
      <div className="hu-social-grid">
        {SOCIALS.map((s) => (
          <a
            key={s.id}
            className="hu-social-card"
            style={{ '--sim-accent': s.accent }}
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="hu-social-icon">
              <SocialIcon name={s.icon} />
            </span>
            <div className="hu-social-text">
              <h3>{s.name}</h3>
              <span className="hu-social-handle">{s.handle}</span>
            </div>
            <span className="hu-social-arrow">
              <ArrowIcon />
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

function Footer({ onLaunch }) {
  return (
    <footer className="hu-footer">
      <div className="hu-footer-main">
        <div className="hu-footer-brand">
          <LogoMark size={22} />
          <span>{SITE.name}</span>
        </div>
        <p className="hu-footer-tag">{SITE.tagline}</p>
      </div>
      <div className="hu-footer-cols">
        <div>
          <h4>Simulations</h4>
          {SIMULATIONS.map((s) => (
            <button key={s.key} type="button" className="hu-footer-link" onClick={() => onLaunch(s.key)}>
              {s.name}
            </button>
          ))}
        </div>
        <div>
          <h4>Learn</h4>
          <a className="hu-footer-link" href="#path">
            Start here
          </a>
          <a className="hu-footer-link" href="#learn">
            Resource library
          </a>
          <a className="hu-footer-link" href="https://astrobites.org/" target="_blank" rel="noreferrer noopener">
            Astrobites
          </a>
        </div>
        <div>
          <h4>Elsewhere</h4>
          {SOCIALS.map((s) => (
            <a key={s.id} className="hu-footer-link" href={s.url} target="_blank" rel="noreferrer noopener">
              {s.name}
            </a>
          ))}
        </div>
      </div>
      <div className="hu-footer-base">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        <span>Built with React, Three.js and far too much coffee.</span>
      </div>
    </footer>
  )
}

export default function Home({ onLaunch }) {
  const { running, burstAt, skip } = useIntro()

  return (
    <div className="hu-home" data-intro={running ? 'running' : undefined}>
      {running ? (
        <button type="button" className="hu-intro-skip" onClick={skip}>
          Skip
        </button>
      ) : null}
      <NavBar onLaunch={onLaunch} />
      <main>
        <Hero onLaunch={onLaunch} burstAt={burstAt} />
        <Simulations onLaunch={onLaunch} />
        <LearningPath />
        <Learn onLaunch={onLaunch} />
        <Follow />
      </main>
      <Footer onLaunch={onLaunch} />
    </div>
  )
}
