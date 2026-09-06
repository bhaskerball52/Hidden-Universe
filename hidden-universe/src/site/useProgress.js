import { useCallback, useState } from 'react'
import { useUser } from '@clerk/react'

// Learning progress for the signed-in user.
//
// Clerk supplies identity, not storage, so this still lives in localStorage,
// keyed by Clerk user id so two people on one machine do not see each other's
// progress. That means progress is per-device for now.
//
// ponytail: localStorage keyed by user id. Move to Clerk publicMetadata (or a
// real backend) when progress needs to follow someone between devices.

const keyFor = (userId) => `hu.progress.${userId}`
const EMPTY = { done: {}, notify: true }

const load = (userId) => {
  if (!userId) return EMPTY
  try {
    return JSON.parse(localStorage.getItem(keyFor(userId)) || 'null') || EMPTY
  } catch {
    return EMPTY // private mode, cleared storage, blocked cookies
  }
}

export function useProgress() {
  const { isLoaded, isSignedIn, user } = useUser()
  const userId = isLoaded && isSignedIn ? user.id : null
  const [state, setState] = useState(() => ({ userId, data: load(userId) }))

  // Re-read when the signed-in user changes. Adjusting state during render is
  // React's documented alternative to an effect that calls setState, and skips
  // the extra render pass a cascading effect would cost.
  if (state.userId !== userId) setState({ userId, data: load(userId) })
  const progress = state.data

  const save = useCallback((next) => {
    setState({ userId, data: next })
    if (!userId) return
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(next))
    } catch {
      /* not fatal: the UI just will not persist */
    }
  }, [userId])

  const toggleStage = useCallback((step) => {
    save({ ...progress, done: { ...progress.done, [step]: !progress.done[step] } })
  }, [progress, save])

  const setNotify = useCallback((on) => save({ ...progress, notify: on }), [progress, save])

  return { progress, toggleStage, setNotify }
}
