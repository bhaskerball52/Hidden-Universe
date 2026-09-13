import { useState } from 'react'
import { MathJaxContext, MathJax } from 'better-react-mathjax'
import './SimPanel.css'

// The Intro / Controls / Physics side panel, shared by every simulation added
// after the original four. Those four each carry their own copy scoped to their
// own class prefix; rather than rewrite working scenes, this is the version the
// new ones use, so ten more simulations do not mean ten more copies.

const MATHJAX_CONFIG = {
  loader: { load: ['[tex]/ams', '[tex]/boldsymbol'] },
  tex: {
    packages: { '[+]': ['ams', 'boldsymbol'] },
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
  },
}

export default function SimPanel({
  title,
  intro = [],
  controls = [],
  physics = [],
  values = {},
  onChange,
  readouts = [],
  accent = '#8b8b9e',
}) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState('intro')

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <div className={`sp2-panel${open ? '' : ' sp2-collapsed'}`} style={{ '--sp2-accent': accent }}>
        <button
          type="button"
          className="sp2-toggle"
          onClick={() => setOpen((o) => !o)}
          title={open ? 'Hide panel' : 'Show panel'}
          aria-label={open ? 'Hide panel' : 'Show panel'}
        >
          {open ? '✕' : '⚙'}
        </button>

        {open ? (
          <>
            <div className="sp2-tabs">
              {['intro', 'controls', 'physics'].map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`sp2-tab${tab === t ? ' sp2-tab-active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="sp2-body">
              {tab === 'intro' ? (
                <>
                  <h2 className="sp2-title">{title}</h2>
                  {intro.map((c) => (
                    <article key={c.title} className="sp2-card">
                      <h3>{c.title}</h3>
                      <p>{c.body}</p>
                    </article>
                  ))}
                </>
              ) : null}

              {tab === 'controls' ? (
                <>
                  <h2 className="sp2-title">Controls</h2>
                  {controls.map(({ key, label, min, max, step, unit, format }) => (
                    <div key={key} className="sp2-row">
                      <div className="sp2-row-head">
                        <span>{label}</span>
                        <span className="sp2-val">
                          {format ? format(values[key]) : `${Number(values[key]).toFixed(step < 1 ? 2 : 0)}${unit || ''}`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={values[key]}
                        onChange={(e) => onChange?.(key, parseFloat(e.target.value))}
                      />
                    </div>
                  ))}

                  {readouts.length ? (
                    <>
                      <h2 className="sp2-title sp2-title-spaced">Live readout</h2>
                      <dl className="sp2-readout">
                        {readouts.map((r) => (
                          <div key={r.label}>
                            <dt>{r.label}</dt>
                            <dd>{r.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  ) : null}
                </>
              ) : null}

              {tab === 'physics' ? (
                <>
                  <h2 className="sp2-title">The physics</h2>
                  {physics.map((c) => (
                    <article key={c.title} className="sp2-card">
                      <h3>{c.title}</h3>
                      <p>{c.body}</p>
                      {c.eq ? (
                        <div className="sp2-eq">
                          <MathJax dynamic>{`\\[${c.eq}\\]`}</MathJax>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </MathJaxContext>
  )
}
