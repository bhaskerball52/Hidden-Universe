// ---------------------------------------------------------------------------
// Math and physics background ladders.
//
// Each course is a node in a DAG: `requires` lists the courses it sits on top
// of. Selecting one implies you have everything upstream of it, so someone can
// tick "Multivariable calculus" and not have to also tick Algebra 1 through
// Calc II. `tier` is only for ordering and section headings in the picker.
// ---------------------------------------------------------------------------

export const MATH_COURSES = [
  // --- school ------------------------------------------------------------
  { id: 'algebra-1', name: 'Algebra 1', tier: 'School', requires: [] },
  { id: 'geometry', name: 'Geometry', tier: 'School', requires: ['algebra-1'] },
  { id: 'algebra-2', name: 'Algebra 2', tier: 'School', requires: ['algebra-1'] },
  { id: 'trigonometry', name: 'Trigonometry', tier: 'School', requires: ['geometry', 'algebra-2'] },
  { id: 'precalculus', name: 'Precalculus', tier: 'School', requires: ['algebra-2', 'trigonometry'] },

  // --- calculus ----------------------------------------------------------
  { id: 'calculus-1', name: 'Calculus I — differential', tier: 'Calculus', requires: ['precalculus'] },
  { id: 'calculus-2', name: 'Calculus II — integral & series', tier: 'Calculus', requires: ['calculus-1'] },
  { id: 'multivariable-calculus', name: 'Multivariable calculus', tier: 'Calculus', requires: ['calculus-2'] },
  { id: 'vector-calculus', name: 'Vector calculus (div, grad, curl)', tier: 'Calculus', requires: ['multivariable-calculus'] },

  // --- core undergraduate ------------------------------------------------
  { id: 'linear-algebra', name: 'Linear algebra', tier: 'Core undergraduate', requires: ['calculus-2'] },
  { id: 'differential-equations', name: 'Ordinary differential equations', tier: 'Core undergraduate', requires: ['calculus-2'] },
  { id: 'probability-statistics', name: 'Probability & statistics', tier: 'Core undergraduate', requires: ['calculus-2'] },
  { id: 'numerical-methods', name: 'Numerical methods', tier: 'Core undergraduate', requires: ['linear-algebra', 'differential-equations'] },

  // --- advanced ----------------------------------------------------------
  { id: 'partial-differential-equations', name: 'Partial differential equations', tier: 'Advanced', requires: ['differential-equations', 'multivariable-calculus'] },
  { id: 'complex-analysis', name: 'Complex analysis', tier: 'Advanced', requires: ['multivariable-calculus'] },
  { id: 'fourier-analysis', name: 'Fourier analysis & transforms', tier: 'Advanced', requires: ['differential-equations'] },
  { id: 'variational-calculus', name: 'Calculus of variations', tier: 'Advanced', requires: ['multivariable-calculus', 'differential-equations'] },
  { id: 'real-analysis', name: 'Real analysis', tier: 'Advanced', requires: ['calculus-2'] },
  { id: 'advanced-probability', name: 'Advanced probability & stochastic processes', tier: 'Advanced', requires: ['probability-statistics', 'real-analysis'] },

  // --- pure / geometry ---------------------------------------------------
  { id: 'group-theory', name: 'Group theory & abstract algebra', tier: 'Pure & geometric', requires: ['linear-algebra'] },
  { id: 'topology', name: 'Topology', tier: 'Pure & geometric', requires: ['real-analysis'] },
  { id: 'differential-geometry', name: 'Differential geometry', tier: 'Pure & geometric', requires: ['multivariable-calculus', 'linear-algebra'] },
  { id: 'tensor-calculus', name: 'Tensor calculus', tier: 'Pure & geometric', requires: ['differential-geometry'] },
]

export const PHYSICS_COURSES = [
  // --- introductory ------------------------------------------------------
  { id: 'conceptual-physics', name: 'Conceptual / general physics', tier: 'Introductory', requires: [] },
  { id: 'mechanics-algebra', name: 'Algebra-based mechanics', tier: 'Introductory', requires: ['conceptual-physics'] },
  { id: 'em-algebra', name: 'Algebra-based electricity & magnetism', tier: 'Introductory', requires: ['mechanics-algebra'] },

  // --- calculus-based core ----------------------------------------------
  { id: 'mechanics-calculus', name: 'Calculus-based mechanics', tier: 'Calculus-based core', requires: ['mechanics-algebra'] },
  { id: 'em-calculus', name: 'Calculus-based electricity & magnetism', tier: 'Calculus-based core', requires: ['mechanics-calculus', 'em-algebra'] },
  { id: 'waves-optics', name: 'Waves & optics', tier: 'Calculus-based core', requires: ['mechanics-calculus'] },
  { id: 'thermodynamics', name: 'Thermodynamics', tier: 'Calculus-based core', requires: ['mechanics-calculus'] },
  { id: 'modern-physics', name: 'Modern physics (intro relativity & quantum)', tier: 'Calculus-based core', requires: ['mechanics-calculus', 'waves-optics'] },
  { id: 'intro-astronomy', name: 'Introductory astronomy', tier: 'Calculus-based core', requires: ['conceptual-physics'] },

  // --- upper undergraduate ----------------------------------------------
  { id: 'special-relativity', name: 'Special relativity', tier: 'Upper undergraduate', requires: ['modern-physics'] },
  { id: 'classical-mechanics', name: 'Classical mechanics (Lagrangian & Hamiltonian)', tier: 'Upper undergraduate', requires: ['mechanics-calculus'] },
  { id: 'statistical-mechanics', name: 'Statistical mechanics', tier: 'Upper undergraduate', requires: ['thermodynamics'] },
  { id: 'quantum-mechanics', name: 'Quantum mechanics', tier: 'Upper undergraduate', requires: ['modern-physics'] },
  { id: 'electrodynamics', name: 'Electrodynamics', tier: 'Upper undergraduate', requires: ['em-calculus', 'special-relativity'] },
  { id: 'computational-physics', name: 'Computational physics', tier: 'Upper undergraduate', requires: ['mechanics-calculus'] },

  // --- graduate ----------------------------------------------------------
  { id: 'general-relativity', name: 'General relativity', tier: 'Graduate', requires: ['special-relativity', 'classical-mechanics'] },
  { id: 'fluid-dynamics', name: 'Fluid dynamics & MHD', tier: 'Graduate', requires: ['classical-mechanics'] },
  { id: 'nuclear-particle', name: 'Nuclear & particle physics', tier: 'Graduate', requires: ['quantum-mechanics'] },
  { id: 'quantum-field-theory', name: 'Quantum field theory', tier: 'Graduate', requires: ['quantum-mechanics', 'special-relativity'] },
]

export const MATH_TIERS = ['School', 'Calculus', 'Core undergraduate', 'Advanced', 'Pure & geometric']
export const PHYSICS_TIERS = ['Introductory', 'Calculus-based core', 'Upper undergraduate', 'Graduate']

const MATH_BY_ID = Object.fromEntries(MATH_COURSES.map((c) => [c.id, c]))
const PHYSICS_BY_ID = Object.fromEntries(PHYSICS_COURSES.map((c) => [c.id, c]))
export const COURSE_BY_ID = { ...MATH_BY_ID, ...PHYSICS_BY_ID }

// Every course upstream of `id`, inclusive. Memoised — the graph never changes.
const closureCache = new Map()
export function withPrerequisites(id) {
  const cached = closureCache.get(id)
  if (cached) return cached
  const seen = new Set()
  const walk = (cur) => {
    if (seen.has(cur)) return
    seen.add(cur)
    for (const r of COURSE_BY_ID[cur]?.requires ?? []) walk(r)
  }
  walk(id)
  closureCache.set(id, seen)
  return seen
}

// Expand a set of ticked courses into everything those imply.
export function expandBackground(ids) {
  const out = new Set()
  for (const id of ids) for (const c of withPrerequisites(id)) out.add(c)
  return out
}

// True when `id` is already implied by something else in the selection — used to
// show the auto-included courses differently from the ones actually ticked.
export function isImpliedBy(id, selectedIds) {
  for (const sel of selectedIds) {
    if (sel === id) continue
    if (withPrerequisites(sel).has(id)) return true
  }
  return false
}

export function courseName(id) {
  return COURSE_BY_ID[id]?.name ?? id
}
