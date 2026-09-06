import { useCallback, useMemo, useState } from 'react'
import { useUser } from '@clerk/react'
import { SIMULATIONS } from './siteData'
import { buildSchedule } from './planSchedule'

// Study-plan state for the signed-in user. The scheduling itself lives in
// studyPlan.js so it can be tested without React or Clerk.
//
// ponytail: localStorage keyed by user id. Move to a backend when a plan needs
// to follow someone between devices.

const KEY = (userId) => `hu.plan.${userId}`

const EMPTY = { goal: null, targetDate: '', done: {}, startedAt: null }

const load = (userId) => {
  if (!userId) return EMPTY
  try {
    return JSON.parse(localStorage.getItem(KEY(userId)) || 'null') || EMPTY
  } catch {
    return EMPTY
  }
}

export function useStudyPlan() {
  const { isLoaded, isSignedIn, user } = useUser()
  const userId = isLoaded && isSignedIn ? user.id : null
  const [state, setState] = useState(() => ({ userId, data: load(userId) }))

  // Adjust during render rather than in an effect: no cascading re-render.
  if (state.userId !== userId) setState({ userId, data: load(userId) })
  const plan = state.data

  const save = useCallback((next) => {
    setState({ userId, data: next })
    if (!userId) return
    try {
      localStorage.setItem(KEY(userId), JSON.stringify(next))
    } catch { /* storage unavailable; the UI just will not persist */ }
  }, [userId])

  const setGoal = useCallback((goal) => save({
    ...plan, goal, startedAt: plan.startedAt || new Date().toISOString().slice(0, 10),
  }), [plan, save])
  const setTargetDate = useCallback((targetDate) => save({ ...plan, targetDate }), [plan, save])
  const toggle = useCallback((key) => save({
    ...plan, done: { ...plan.done, [key]: !plan.done[key] },
  }), [plan, save])
  const reset = useCallback(() => save(EMPTY), [save])

  const schedule = useMemo(
    () => (plan.goal ? buildSchedule(plan.goal, plan.targetDate) : []),
    [plan.goal, plan.targetDate]
  )

  const stats = useMemo(() => {
    const all = schedule.flatMap((w) => w.topics.map((t) => `topic:${t.id}`))
    const sims = SIMULATIONS.map((s) => `sim:${s.key}`)
    const doneTopics = all.filter((k) => plan.done[k]).length
    const doneSims = sims.filter((k) => plan.done[k]).length
    return {
      topics: all.length, doneTopics,
      sims: sims.length, doneSims,
      pct: all.length ? Math.round((doneTopics / all.length) * 100) : 0,
    }
  }, [schedule, plan.done])

  // The single most useful thing on the page: what to do next.
  const nextUp = useMemo(() => {
    // Flat find rather than nested loops with early returns: the React Compiler
    // cannot preserve memoization across those, and this reads better anyway.
    const flat = schedule.flatMap((w) => w.topics.map((t) => ({ topic: t, week: w.week })))
    return flat.find((x) => !plan.done[`topic:${x.topic.id}`]) ?? null
  }, [schedule, plan.done])

  return { plan, schedule, stats, nextUp, setGoal, setTargetDate, toggle, reset, signedIn: !!userId }
}
