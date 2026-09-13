import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SIMULATIONS } from '../../site/siteData'
import './SimSwitcher.css'

// The simulation switcher.
//
// Replaces the SimTypeBar that used to be copy-pasted into all four scenes with
// its list of simulations hardcoded. With fourteen scenes a row of pills no
// longer fits, so this is a dropdown panel with a search field, grouped by the
// kicker each simulation already carries in the registry.
//
// Rendered above the canvas and deliberately compact when closed, because the
// canvas underneath wants the drags: opening is an explicit click.

const groupOf = (sim) => sim.kicker || 'Other'

export default function SimSwitcher({ current, onSwitchSim }) {
  const [open, setOpen] = useState(false)
  // Query and highlight travel together: changing the text must reset the
  // highlight, and holding them in one object does that without an effect.
  const [search, setSearch] = useState({ query: '', active: 0 })
  const { query, active } = search
  const setQuery = useCallback((q) => setSearch({ query: q, active: 0 }), [])
  const setActive = useCallback((fn) => setSearch((s) => ({ ...s, active: typeof fn === 'function' ? fn(s.active) : fn })), [])
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const currentSim = SIMULATIONS.find((s) => s.key === current)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SIMULATIONS
    return SIMULATIONS.filter((s) =>
      `${s.name} ${s.kicker} ${s.level} ${(s.concepts || []).join(' ')}`
        .toLowerCase()
        .includes(q)
    )
  }, [query])

  const groups = useMemo(() => {
    const by = new Map()
    for (const s of results) {
      if (!by.has(groupOf(s))) by.set(groupOf(s), [])
      by.get(groupOf(s)).push(s)
    }
    return [...by.entries()]
  }, [results])

  // Flat order for keyboard navigation, matching what is rendered.
  const flat = useMemo(() => groups.flatMap(([, items]) => items), [groups])

  const pick = useCallback((key) => {
    setOpen(false)
    setQuery('')
    if (key !== current) onSwitchSim?.(key)
  }, [current, onSwitchSim, setQuery])

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && flat[active]) {
        e.preventDefault()
        pick(flat[active].key)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, flat, active, pick, setActive])

  return (
    <div className={`sw-root${open ? ' sw-root-open' : ''}`} ref={rootRef}>
      <div className="sw-bar">
        <button
          type="button"
          className="sw-home"
          onClick={() => onSwitchSim?.('home')}
          title="Back to Hidden Universe"
          aria-label="Back to Hidden Universe home"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5.5 9.5V20h13V9.5" />
          </svg>
        </button>

        <button
          type="button"
          className="sw-current"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="sw-dot" style={{ background: currentSim?.accent || '#8b8b9e' }} />
          <span className="sw-current-name">{currentSim?.name || 'Simulations'}</span>
          <span className="sw-count">{SIMULATIONS.length}</span>
          <svg className="sw-chev" width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="sw-panel" role="listbox" aria-label="Choose a simulation">
          <div className="sw-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search simulations…"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search simulations"
            />
            {query ? (
              <button type="button" className="sw-clear" onClick={() => setQuery('')} aria-label="Clear search">
                ✕
              </button>
            ) : null}
          </div>

          <div className="sw-list">
            {groups.length === 0 ? (
              <p className="sw-empty">Nothing matches “{query}”.</p>
            ) : (
              groups.map(([group, items]) => (
                <div className="sw-group" key={group}>
                  <div className="sw-group-label">{group}</div>
                  {items.map((s) => {
                    const i = flat.indexOf(s)
                    return (
                      <button
                        type="button"
                        key={s.key}
                        role="option"
                        aria-selected={s.key === current}
                        className={
                          'sw-item' +
                          (s.key === current ? ' sw-item-current' : '') +
                          (i === active ? ' sw-item-active' : '')
                        }
                        style={{ '--sw-accent': s.accent }}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(s.key)}
                      >
                        <span className="sw-item-dot" />
                        <span className="sw-item-text">
                          <span className="sw-item-name">{s.name}</span>
                          <span className="sw-item-level">{s.level}</span>
                        </span>
                        {s.key === current ? <span className="sw-item-here">open</span> : null}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
