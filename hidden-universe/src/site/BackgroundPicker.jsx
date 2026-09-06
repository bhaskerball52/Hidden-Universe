import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MATH_COURSES,
  MATH_TIERS,
  PHYSICS_COURSES,
  PHYSICS_TIERS,
  courseName,
  expandBackground,
  withPrerequisites,
} from './curriculum'

// A checkbox combobox over one course ladder. Ticking a course implies
// everything upstream of it, so nobody has to tick Algebra 1 through Calc II to
// say they have done multivariable calculus.
function LadderPicker({ label, placeholder, courses, tiers, selected, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const covered = useMemo(() => expandBackground(selected), [selected])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter((c) => `${c.name} ${c.tier}`.toLowerCase().includes(q))
  }, [query, courses])

  const byTier = useMemo(() => {
    const out = []
    for (const tier of tiers) {
      const items = matches.filter((c) => c.tier === tier)
      if (items.length) out.push([tier, items])
    }
    return out
  }, [matches, tiers])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
      return
    }
    // Drop anything the new pick already implies, so the chips stay tidy.
    const implied = withPrerequisites(id)
    onChange([...selected.filter((s) => !implied.has(s)), id])
  }

  // Chips show explicit picks; the implied ones are summarised as a count.
  const impliedCount = covered.size - selected.length

  return (
    <div className="bp-picker" ref={wrapRef}>
      <label className="bp-label">{label}</label>
      <div className="bp-input-wrap">
        <input
          className="bp-input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        {selected.length ? <span className="bp-count">{covered.size}</span> : null}
      </div>

      {open ? (
        <div className="bp-dropdown" role="group" aria-label={`${label} options`}>
          {byTier.length ? (
            byTier.map(([tier, items]) => (
              <div className="bp-tier" key={tier}>
                <div className="bp-tier-label">{tier}</div>
                {items.map((c) => {
                  const checked = selected.includes(c.id)
                  const auto = !checked && covered.has(c.id)
                  const adds = withPrerequisites(c.id).size - 1
                  return (
                    <label
                      key={c.id}
                      className={`bp-option${auto ? ' bp-option-auto' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked || auto}
                        disabled={auto}
                        onChange={() => toggle(c.id)}
                      />
                      <span className="bp-option-name">{c.name}</span>
                      {auto ? (
                        <span className="bp-option-note">included</span>
                      ) : adds ? (
                        <span className="bp-option-note">+{adds} below</span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            ))
          ) : (
            <p className="bp-empty">No match for “{query}”.</p>
          )}
        </div>
      ) : null}

      {selected.length ? (
        <div className="bp-chips">
          {selected.map((id) => (
            <button
              key={id}
              type="button"
              className="bp-chip"
              onClick={() => toggle(id)}
              title="Remove"
            >
              {courseName(id)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          {impliedCount > 0 ? (
            <span className="bp-chip bp-chip-implied">+{impliedCount} implied</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function BackgroundPicker({ math, physics, onChangeMath, onChangePhysics, onReset }) {
  const any = math.length || physics.length
  return (
    <div className="bp">
      <div className="bp-head">
        <p className="bp-intro">
          <strong>Optional:</strong> tell us how far you have got in maths and physics, and every
          topic will show whether you are ready for it, and exactly what to learn first if not.
          Picking your highest course fills in everything below it.
        </p>
        {any ? (
          <button type="button" className="bp-reset" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
      <div className="bp-row">
        <LadderPicker
          label="Maths you have taken"
          placeholder="e.g. multivariable calculus, linear algebra…"
          courses={MATH_COURSES}
          tiers={MATH_TIERS}
          selected={math}
          onChange={onChangeMath}
        />
        <LadderPicker
          label="Physics you have taken"
          placeholder="e.g. quantum mechanics, special relativity…"
          courses={PHYSICS_COURSES}
          tiers={PHYSICS_TIERS}
          selected={physics}
          onChange={onChangePhysics}
        />
      </div>
    </div>
  )
}
