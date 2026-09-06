import { useState } from 'react'
import { SignUpButton, useUser } from '@clerk/react'
import SpotlightCard from '../components/SpotlightCard'
import { SIMULATIONS, SITE } from './siteData'
import { GOALS, goalById, weeksUntil } from './planSchedule'
import { useStudyPlan } from './useStudyPlan'
import './StudyPlan.css'

// The study plan page (#/plan).
//
// Built around one question: what should I do tonight? Everything else on the
// page is in service of that. The goal and the date set the pace, the plan is
// generated rather than typed out, and the first unchecked topic is promoted to
// the top so the page opens on an action rather than a dashboard.

const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined,
    { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default function StudyPlan({ onLaunch, onHome }) {
  const { isLoaded, isSignedIn } = useUser()
  const { plan, schedule, stats, nextUp, setGoal, setTargetDate, toggle, reset } = useStudyPlan()
  const [openWeek, setOpenWeek] = useState(1)

  const goal = plan.goal ? goalById(plan.goal) : null
  const until = weeksUntil(plan.targetDate)
  const simsDone = SIMULATIONS.filter((s) => plan.done[`sim:${s.key}`]).length

  if (!isLoaded) return <div className="sp-shell" />

  if (!isSignedIn) {
    return (
      <div className="sp-shell">
        <PlanNav onHome={onHome} />
        <main className="sp-gate">
          <h1>Your plan lives with your account</h1>
          <p>
            Pick what you are working toward and {SITE.name} lays out the route week by week,
            keeps what you have finished, and tells you what to do next.
          </p>
          <SignUpButton mode="modal">
            <button type="button" className="sp-cta">Create an account</button>
          </SignUpButton>
        </main>
      </div>
    )
  }

  return (
    <div className="sp-shell">
      <PlanNav onHome={onHome} />
      <div className="sp-body">
        {/* Left rail: the pace-setting facts, always on screen. */}
        <aside className="sp-rail">
          <label className="sp-field">
            <span>Working toward</span>
            <select
              value={plan.goal || ''}
              onChange={(e) => setGoal(e.target.value || null)}
            >
              <option value="">Choose a goal</option>
              {GOALS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          {goal ? <p className="sp-goal-note">{goal.note}</p> : null}

          <label className="sp-field">
            <span>Target date</span>
            <input
              type="date"
              value={plan.targetDate || ''}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>

          {until ? (
            <div className={`sp-count${until.days < 0 ? ' sp-count-past' : ''}`}>
              <strong>{Math.abs(until.days)}</strong>
              <span>{until.days < 0 ? 'days ago' : until.days === 1 ? 'day to go' : 'days to go'}</span>
              {until.days >= 0 ? <em>{until.weeks} weeks of runway</em> : null}
            </div>
          ) : null}

          {plan.goal ? (
            <>
              <Ring pct={stats.pct} />
              <dl className="sp-tally">
                <div><dt>Topics</dt><dd>{stats.doneTopics} of {stats.topics}</dd></div>
                <div><dt>Simulations</dt><dd>{simsDone} of {SIMULATIONS.length}</dd></div>
                {plan.startedAt ? <div><dt>Started</dt><dd>{fmtDate(plan.startedAt)}</dd></div> : null}
              </dl>
              <button type="button" className="sp-reset" onClick={reset}>Start over</button>
            </>
          ) : null}
        </aside>

        <main className="sp-main">
          {!plan.goal ? (
            <GoalPicker onPick={setGoal} />
          ) : (
            <>
              {nextUp ? (
                <SpotlightCard className="sp-next" spotlightColor="rgba(192,132,252,0.22)">
                  <p className="sp-next-label">Next up, week {nextUp.week}</p>
                  <h2>{nextUp.topic.name}</h2>
                  <p className="sp-next-blurb">{nextUp.topic.blurb}</p>
                  <div className="sp-next-row">
                    <button
                      type="button"
                      className="sp-cta"
                      onClick={() => toggle(`topic:${nextUp.topic.id}`)}
                    >
                      Mark as done
                    </button>
                    <a className="sp-link" href="#learn" onClick={onHome}>
                      Open it in the topic finder
                    </a>
                  </div>
                </SpotlightCard>
              ) : (
                <div className="sp-done">
                  <h2>Every topic in this plan is checked off.</h2>
                  <p>Move the target date out, or switch goals to pick up a harder set.</p>
                </div>
              )}

              <section className="sp-section">
                <h2 className="sp-h2">The weeks ahead</h2>
                <ol className="sp-weeks">
                  {schedule.map((w) => {
                    const done = w.topics.filter((t) => plan.done[`topic:${t.id}`]).length
                    const complete = done === w.topics.length
                    const open = openWeek === w.week
                    return (
                      <li key={w.week} className={`sp-week${complete ? ' sp-week-done' : ''}`}>
                        <button
                          type="button"
                          className="sp-week-head"
                          aria-expanded={open}
                          onClick={() => setOpenWeek(open ? 0 : w.week)}
                        >
                          <span className="sp-week-n">{String(w.week).padStart(2, '0')}</span>
                          <span className="sp-week-meta">
                            <strong>{w.topics.length} topics</strong>
                            <em>{done} done</em>
                          </span>
                          <span className="sp-week-bar" aria-hidden="true">
                            <i style={{ width: `${(done / w.topics.length) * 100}%` }} />
                          </span>
                        </button>
                        {open ? (
                          <ul className="sp-topics">
                            {w.topics.map((t) => {
                              const key = `topic:${t.id}`
                              return (
                                <li key={t.id}>
                                  <label className={plan.done[key] ? 'sp-topic sp-topic-done' : 'sp-topic'}>
                                    <input
                                      type="checkbox"
                                      checked={!!plan.done[key]}
                                      onChange={() => toggle(key)}
                                    />
                                    <span className="sp-topic-name">{t.name}</span>
                                    <span className="sp-topic-level">{t.level}</span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              </section>

              <section className="sp-section">
                <h2 className="sp-h2">Simulations to run</h2>
                <ul className="sp-sims">
                  {SIMULATIONS.map((s) => {
                    const key = `sim:${s.key}`
                    return (
                      <li key={s.key} style={{ '--sim-accent': s.accent }}>
                        <label className={plan.done[key] ? 'sp-sim sp-sim-done' : 'sp-sim'}>
                          <input type="checkbox" checked={!!plan.done[key]} onChange={() => toggle(key)} />
                          <span className="sp-sim-name">{s.name}</span>
                        </label>
                        <button type="button" className="sp-link" onClick={() => onLaunch(s.key)}>
                          Launch
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function GoalPicker({ onPick }) {
  return (
    <section className="sp-section">
      <h2 className="sp-h2">What are you working toward?</h2>
      <p className="sp-lede">
        This sets the pace and which topics matter. You can change it whenever you like.
      </p>
      <div className="sp-goals">
        {GOALS.map((g) => (
          <button type="button" key={g.id} className="sp-goal" onClick={() => onPick(g.id)}>
            <strong>{g.name}</strong>
            <span>{g.note}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Ring({ pct }) {
  const R = 34
  const C = 2 * Math.PI * R
  return (
    <svg className="sp-ring" viewBox="0 0 80 80" width="80" height="80" role="img"
      aria-label={`${pct} percent of topics done`}>
      <circle cx="40" cy="40" r={R} className="sp-ring-bg" />
      <circle cx="40" cy="40" r={R} className="sp-ring-fg"
        strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
      <text x="40" y="40" className="sp-ring-label">{pct}%</text>
    </svg>
  )
}

function PlanNav({ onHome }) {
  return (
    <header className="sp-nav">
      <a href="#/" onClick={onHome} className="sp-back">{SITE.name}</a>
      <span className="sp-nav-title">Study plan</span>
    </header>
  )
}
