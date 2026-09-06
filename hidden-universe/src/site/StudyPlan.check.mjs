// Self-check for the study-plan scheduler. Run: node src/site/StudyPlan.check.mjs
import assert from 'node:assert/strict'
import { GOALS, goalById, topicsForGoal, buildSchedule, weeksUntil } from './planSchedule.js'

assert.ok(GOALS.length >= 5, 'expected several goals')
assert.equal(goalById('nope').id, 'self', 'unknown goal falls back to self-paced')

// Every goal must produce a non-empty, correctly ordered topic list.
const RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 }
for (const g of GOALS) {
  const t = topicsForGoal(g.id)
  assert.ok(t.length > 0, `${g.id} produced no topics`)
  for (let i = 1; i < t.length; i++) {
    assert.ok(RANK[t[i - 1].level] <= RANK[t[i].level],
      `${g.id} is out of order at ${i}: ${t[i - 1].level} before ${t[i].level}`)
  }
  assert.ok(!t.some((x) => x.group === 'Competitions'),
    `${g.id} must not schedule competition entries as study topics`)
}

// Scheduling must place every topic exactly once, whatever the horizon.
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
for (const days of [7, 30, 140, 400]) {
  const sched = buildSchedule('usaaao', iso(days))
  const ids = sched.flatMap((w) => w.topics.map((t) => t.id))
  assert.equal(new Set(ids).size, ids.length, `duplicate topics at ${days} days`)
  assert.equal(ids.length, topicsForGoal('usaaao').length, `dropped topics at ${days} days`)
  assert.ok(sched.every((w, i) => w.week === i + 1), 'week numbers must be 1..n')
}

// A short horizon compresses rather than dropping work.
const tight = buildSchedule('usaaao', iso(7))
const roomy = buildSchedule('usaaao', iso(400))
assert.ok(tight.length < roomy.length, 'a nearer date must mean fewer, fuller weeks')
assert.ok(tight[0].topics.length > roomy[0].topics.length, 'a nearer date must mean more per week')

// No date still yields a usable plan.
const open = buildSchedule('self', '')
assert.ok(open.length > 0 && open[0].topics.length > 0, 'self-paced needs a shape too')

// A date in the past must not produce negative or zero weeks.
const past = buildSchedule('usaaao', iso(-30))
assert.ok(past.length > 0, 'a past date must still schedule something')
assert.ok(weeksUntil(iso(-30)).days < 0, 'past dates report negative days')
assert.equal(weeksUntil(''), null, 'no date reports null')

console.log(`Study plan scheduler: all assertions passed ` +
  `(${GOALS.length} goals, ${topicsForGoal('usaaao').length} topics for USAAAO)`)
