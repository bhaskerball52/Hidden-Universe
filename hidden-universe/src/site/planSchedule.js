import { TOPICS } from './topics.js'

// Scheduling logic behind the study plan.
//
// Named planSchedule, not studyPlan: macOS filesystems are case-insensitive, so
// studyPlan.js and StudyPlan.jsx in one folder collide and the lazy import of
// the page silently resolves to this module instead.
//
// Deliberately free of React and Clerk so it can be unit-tested in node without
// a browser: see StudyPlan.check.mjs.
//
// Stored per Clerk user id in localStorage, same as the route tracker. Identity
// comes from Clerk; storage does not, so this is still per-device.
//
// ponytail: localStorage keyed by user id. Move to a backend when a plan needs
// to follow someone between devices.

const KEY = (userId) => `hu.plan.${userId}`

// Ordering the whole catalogue by level then group gives a defensible default
// route: you cannot read a rotation curve before you can read a magnitude.
const LEVEL_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2 }

export const GOALS = [
  {
    id: 'usaaao',
    name: 'USAAAO',
    note: 'US national selection round for the IOAA.',
    topicId: 'usaaao',
    // Which of the 43 non-competition topics matter most for this goal.
    groups: ['Observing & the night sky', 'Solar system & planets', 'Stars & stellar physics',
      'Galaxies & the universe', 'Cosmology', 'Physics foundations'],
  },
  {
    id: 'ioaa',
    name: 'IOAA',
    note: 'International olympiad. Theory, data analysis and observation.',
    topicId: 'ioaa',
    groups: ['Stars & stellar physics', 'Galaxies & the universe', 'Cosmology',
      'Physics foundations', 'Relativity & gravity', 'Tools & data skills',
      'Observing & the night sky'],
  },
  {
    id: 'iaac',
    name: 'IAAC',
    note: 'Online, open entry, no national qualification needed.',
    topicId: 'iaac',
    groups: ['Observing & the night sky', 'Solar system & planets', 'Stars & stellar physics',
      'Galaxies & the universe'],
  },
  {
    id: 'science-olympiad-astronomy',
    name: 'Science Olympiad',
    note: 'Astronomy event. Binder-based, so lookup speed matters.',
    topicId: 'science-olympiad-astronomy',
    groups: ['Stars & stellar physics', 'Galaxies & the universe', 'Cosmology'],
  },
  {
    id: 'physics-olympiad',
    name: 'Physics Olympiad',
    note: 'F=ma through USAPhO. Mechanics first.',
    topicId: 'physics-olympiad',
    groups: ['Physics foundations', 'Relativity & gravity'],
  },
  {
    id: 'self',
    name: 'Just learning',
    note: 'No exam. Work through the field at your own pace.',
    topicId: null,
    groups: null, // everything
  },
]

export const goalById = (id) => GOALS.find((g) => g.id === id) || GOALS[GOALS.length - 1]

// Topics for a goal, in a sensible teaching order.
export function topicsForGoal(goalId) {
  const goal = goalById(goalId)
  const pool = TOPICS.filter((t) => t.group !== 'Competitions')
  const picked = goal.groups ? pool.filter((t) => goal.groups.includes(t.group)) : pool
  return [...picked].sort(
    (a, b) => (LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]) || a.group.localeCompare(b.group)
  )
}

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const DAY = 86400000

export function weeksUntil(dateStr) {
  if (!dateStr) return null
  const days = Math.ceil((startOfDay(dateStr) - startOfDay(new Date())) / DAY)
  return { days, weeks: Math.max(1, Math.ceil(days / 7)) }
}

// Spread the topics evenly across the weeks available. With no date, fall back
// to a steady three per week so the plan still has a shape.
export function buildSchedule(goalId, targetDate) {
  const topics = topicsForGoal(goalId)
  const until = weeksUntil(targetDate)
  const weeks = until && until.days > 0 ? until.weeks : Math.ceil(topics.length / 3)
  const perWeek = Math.max(1, Math.ceil(topics.length / weeks))
  const out = []
  for (let w = 0; w < weeks; w++) {
    const slice = topics.slice(w * perWeek, (w + 1) * perWeek)
    if (!slice.length) break
    out.push({ week: w + 1, topics: slice })
  }
  return out
}
