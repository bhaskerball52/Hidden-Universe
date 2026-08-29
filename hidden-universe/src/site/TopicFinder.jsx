import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { SIMULATIONS } from './siteData'
import { SUGGESTED_TOPIC_IDS, TOPICS, searchTopics } from './topics'
import { ArrowIcon, ExternalIcon } from './Icons'
import BackgroundPicker from './BackgroundPicker'
import { COURSES, COURSE_FOR_BACKGROUND } from './courses'
import { courseName, expandBackground } from './curriculum'
import './TopicFinder.css'

const BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t]))
const SIM_BY_KEY = Object.fromEntries(SIMULATIONS.map((s) => [s.key, s]))
const SUGGESTED = SUGGESTED_TOPIC_IDS.map((id) => BY_ID[id]).filter(Boolean)

// Which prerequisites a visitor is missing for a topic. `covered` is the
// expanded background (every course implied by what they ticked). With no
// background given we say nothing rather than guessing.
function readiness(topic, covered, hasBackground) {
  const required = [...topic.prereqs.math, ...topic.prereqs.physics]
  const missing = required.filter((id) => !covered.has(id))
  if (!hasBackground) return { state: 'unknown', missing: [], required }
  if (!missing.length) return { state: 'ready', missing: [], required }
  return { state: missing.length <= 1 ? 'stretch' : 'gap', missing, required }
}

// Group a flat result list into [groupName, topics[]]. Groups appear in order of
// first match, and each one appears exactly once — results are ranked by score,
// so the same group can otherwise resurface further down the list and render a
// duplicate heading.
function groupResults(list) {
  const byGroup = new Map()
  for (const topic of list) {
    const bucket = byGroup.get(topic.group)
    if (bucket) bucket.push(topic)
    else byGroup.set(topic.group, [topic])
  }
  return [...byGroup]
}

function TopicPlan({ topic, onLaunch, onClear, covered, hasBackground }) {
  const sims = (topic.sims ?? []).map((k) => SIM_BY_KEY[k]).filter(Boolean)
  const ready = readiness(topic, covered, hasBackground)
  // Some references are also listed as a course for the same topic (Carroll's GR
  // notes, Tong's lectures). Show each URL once, under Courses.
  const courseUrls = new Set((topic.courses ?? []).map((id) => COURSES[id]?.url).filter(Boolean))
  const refs = topic.links.filter((l) => !courseUrls.has(l.u))
  return (
    <div className="tf-plan" role="region" aria-label={`Learning plan for ${topic.name}`}>
      <div className="tf-plan-head">
        <div>
          <span className="tf-plan-group">{topic.group}</span>
          <h3 className="tf-plan-title">{topic.name}</h3>
        </div>
        <div className="tf-plan-head-right">
          <span className="hu-chip hu-chip-quiet">{topic.level}</span>
          <button type="button" className="tf-clear" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>

      <p className="tf-plan-blurb">{topic.blurb}</p>

      <div className={`tf-prereq tf-prereq-${ready.state}`}>
        <div className="tf-prereq-head">
          <span className="tf-prereq-badge">
            {ready.state === 'ready'
              ? 'You have the background for this'
              : ready.state === 'stretch'
                ? 'Almost — one gap'
                : ready.state === 'gap'
                  ? 'Build these first'
                  : 'Assumed background'}
          </span>
        </div>
        {ready.required.length ? (
          <ul className="tf-prereq-list">
            {ready.required.map((id) => {
              const missing = ready.missing.includes(id)
              const course = COURSES[COURSE_FOR_BACKGROUND[id]]
              return (
                <li key={id} className={missing ? 'tf-prereq-missing' : 'tf-prereq-met'}>
                  <span className="tf-prereq-mark" aria-hidden="true">
                    {hasBackground ? (missing ? '○' : '✓') : '·'}
                  </span>
                  <span>{courseName(id)}</span>
                  {missing && course ? (
                    <a href={course.url} target="_blank" rel="noreferrer noopener" className="tf-prereq-fix">
                      start with {course.name} ↗
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="tf-prereq-none">No formal prerequisites — you can start here today.</p>
        )}
      </div>

      <div className="tf-plan-cols">
        <div className="tf-plan-col">
          <h4 className="tf-plan-label">How to approach it</h4>
          <ol className="tf-steps">
            {topic.plan.map((step, i) => (
              <li key={i}>
                <span className="tf-step-n">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="tf-plan-col">
          <h4 className="tf-plan-label">Courses</h4>
          <div className="tf-links">
            {(topic.courses ?? []).map((id) => {
              const c = COURSES[id]
              if (!c) return null
              return (
                <a key={id} className="tf-link tf-link-course" href={c.url} target="_blank" rel="noreferrer noopener">
                  <span className="tf-link-text">
                    <span className="tf-link-title">{c.name}</span>
                    <span className="tf-link-source">
                      {c.provider} · {c.format}
                    </span>
                  </span>
                  <ExternalIcon />
                </a>
              )
            })}
          </div>

          {refs.length ? (
            <>
              <h4 className="tf-plan-label tf-plan-label-spaced">Tools &amp; references</h4>
              <div className="tf-links">
                {refs.map((l) => (
                  <a
                    key={l.u}
                    className="tf-link"
                    href={l.u}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <span className="tf-link-text">
                      <span className="tf-link-title">{l.t}</span>
                      <span className="tf-link-source">{l.s}</span>
                    </span>
                    <ExternalIcon />
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {sims.length ? (
        <div className="tf-plan-sims">
          <h4 className="tf-plan-label">See it running here</h4>
          <div className="tf-sim-row">
            {sims.map((s) => (
              <button
                key={s.key}
                type="button"
                className="tf-sim-btn"
                style={{ '--sim-accent': s.accent }}
                onClick={() => onLaunch(s.key)}
              >
                {s.name}
                <ArrowIcon />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function TopicFinder({ onLaunch }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState(null)
  const [math, setMath] = useState([])
  const [physics, setPhysics] = useState([])
  const [readyOnly, setReadyOnly] = useState(false)

  const hasBackground = math.length > 0 || physics.length > 0
  const covered = useMemo(() => expandBackground([...math, ...physics]), [math, physics])

  const listId = useId()
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const optionRefs = useRef([])

  // With no query the dropdown offers a handful of common starting points.
  // Once a background is given, whatever they are ready for floats to the top —
  // and `readyOnly` turns that ranking into a hard filter.
  const results = useMemo(() => {
    const base = query.trim() ? searchTopics(query, 24) : SUGGESTED
    if (!hasBackground) return base.slice(0, 12)
    const rank = { ready: 0, stretch: 1, gap: 2, unknown: 1 }
    const withState = base.map((t) => ({ t, r: readiness(t, covered, true) }))
    const kept = readyOnly ? withState.filter((x) => x.r.state === 'ready') : withState
    return kept
      .sort((a, b) => rank[a.r.state] - rank[b.r.state])
      .slice(0, 12)
      .map((x) => x.t)
  }, [query, hasBackground, covered, readyOnly])

  const hiddenByFilter = useMemo(() => {
    if (!hasBackground || !readyOnly) return 0
    const base = query.trim() ? searchTopics(query, 24) : SUGGESTED
    return base.filter((t) => readiness(t, covered, true).state !== 'ready').length
  }, [query, hasBackground, covered, readyOnly])
  const grouped = useMemo(() => groupResults(results), [results])

  // Flat position of each topic in the result list, so the grouped markup below
  // can label options without mutating a counter mid-render.
  const indexById = useMemo(
    () => new Map(results.map((t, i) => [t.id, i])),
    [results]
  )

  // Clamped rather than reset in an effect: the result list shrinks as the user
  // types, and the highlight must stay in range on the same render.
  const activeIndex = results.length ? Math.min(active, results.length - 1) : -1

  // Keep the highlighted option in view during keyboard navigation.
  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  // Close on an outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const choose = useCallback((topic) => {
    setSelected(topic)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }, [])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const dir = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => {
        const from = results.length ? Math.min(i, results.length - 1) : 0
        return (from + dir + results.length) % results.length
      })
    } else if (e.key === 'Enter') {
      if (open && results[activeIndex]) {
        e.preventDefault()
        choose(results[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Home' && open) {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End' && open) {
      e.preventDefault()
      setActive(results.length - 1)
    }
  }

  return (
    <div className="tf">
      <div className="tf-search-wrap" ref={wrapRef}>
        <span className="tf-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="tf-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
          autoComplete="off"
          placeholder="What do you want to learn? Try “orbital mechanics”, “USAAAO”, “constellations”…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // Focus alone isn't enough: after Escape the input keeps focus, so a
          // click has to be able to reopen the list too.
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button type="button" className="tf-search-clear" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="Clear search">
            ×
          </button>
        ) : null}

        {open ? (
          <div className="tf-dropdown" id={listId} role="listbox" aria-label="Topics and competitions">
            {results.length ? (
              <>
                {hasBackground ? (
                  <label className="tf-readyonly">
                    <input type="checkbox" checked={readyOnly} onChange={(e) => setReadyOnly(e.target.checked)} />
                    Only show what I am ready for
                    {readyOnly && hiddenByFilter ? <span className="tf-readyonly-count">{hiddenByFilter} hidden</span> : null}
                  </label>
                ) : null}
                {!query.trim() ? <p className="tf-hint">Popular starting points — or type to search {TOPICS.length} topics</p> : null}
                {grouped.map(([group, items]) => (
                  <div className="tf-group" key={group}>
                    <div className="tf-group-label">{group}</div>
                    {items.map((topic) => {
                      const i = indexById.get(topic.id)
                      return (
                        <div
                          key={topic.id}
                          id={`${listId}-${topic.id}`}
                          ref={(el) => { optionRefs.current[i] = el }}
                          role="option"
                          aria-selected={i === activeIndex}
                          className={`tf-option${i === activeIndex ? ' tf-option-active' : ''}`}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => choose(topic)}
                        >
                          <span className="tf-option-main">
                            <span className="tf-option-name">{topic.name}</span>
                            <span className="tf-option-blurb">{topic.blurb}</span>
                          </span>
                          <span className="tf-option-meta">
                            {topic.kind === 'competition' ? (
                              <span className="tf-badge tf-badge-comp">Competition</span>
                            ) : null}
                            {hasBackground ? (
                              (() => {
                                const r = readiness(topic, covered, true)
                                return (
                                  <span className={`tf-badge tf-badge-${r.state}`}>
                                    {r.state === 'ready'
                                      ? 'Ready'
                                      : r.state === 'stretch'
                                        ? '1 gap'
                                        : `${r.missing.length} gaps`}
                                  </span>
                                )
                              })()
                            ) : null}
                            <span className="tf-option-level">{topic.level}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </>
            ) : (
              <p className="tf-hint tf-hint-empty">
                {readyOnly && hiddenByFilter ? (
                  <>
                    Nothing here matches your background yet.{' '}
                    <button type="button" className="tf-inline-btn" onClick={() => setReadyOnly(false)}>
                      Show all {hiddenByFilter}
                    </button>{' '}
                    to see what to build toward.
                  </>
                ) : (
                  <>Nothing matches “{query}”. Try a broader term — “relativity”, “stars”, “data”.</>
                )}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <BackgroundPicker
        math={math}
        physics={physics}
        onChangeMath={setMath}
        onChangePhysics={setPhysics}
        onReset={() => {
          setMath([])
          setPhysics([])
          setReadyOnly(false)
        }}
      />

      {selected ? (
        <TopicPlan
          topic={selected}
          onLaunch={onLaunch}
          onClear={() => setSelected(null)}
          covered={covered}
          hasBackground={hasBackground}
        />
      ) : null}
    </div>
  )
}
