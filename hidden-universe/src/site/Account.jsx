import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react'
import { PATH } from './siteData'
import './Account.css'

// Account controls and the progress tracker.
//
// Auth is real Clerk. The hand-rolled dialog that used to live here is gone:
// Clerk's modal already does OAuth, email codes and verification properly, and
// keeping a second one would have meant maintaining a worse copy. The site's
// own button styling is preserved by passing children to Clerk's buttons.

/* --- nav controls --------------------------------------------------------- */

export function AccountNav() {
  return (
    <div className="ac-nav">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="ac-nav-ghost">Log in</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="ac-nav-solid">Sign up</button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }}
          userProfileProps={{ appearance: { elements: { card: { border: '1px solid rgba(255,255,255,0.16)' } } } }}
        />
      </Show>
    </div>
  )
}

/* --- progress tracker, sits beside the route ------------------------------ */

export function ProgressTracker({ progress, onToggleStage, onSetNotify }) {
  const { isLoaded, isSignedIn } = useUser()
  // isSignedIn is meaningless until isLoaded, so treat "still loading" as
  // signed out rather than flashing a signed-in shell that then disappears.
  const signedIn = isLoaded && isSignedIn

  const done = progress?.done || {}
  const count = PATH.filter((s) => done[s.step]).length
  const pct = signedIn ? Math.round((count / PATH.length) * 100) : 0

  return (
    <aside className="ac-track" aria-label="Your progress">
      <div className="ac-track-top">
        <span className="hu-eyebrow">Your progress</span>
        <Ring pct={pct} muted={!signedIn} />
      </div>

      <ol className="ac-stages">
        {PATH.map((stage) => {
          const isDone = signedIn && !!done[stage.step]
          const row = (
            <button
              type="button"
              className={`ac-stage${isDone ? ' ac-stage-done' : ''}`}
              onClick={signedIn ? () => onToggleStage(stage.step) : undefined}
              aria-pressed={isDone}
            >
              <span className="ac-tick">{isDone ? <CheckIcon /> : <span className="ac-tick-empty" />}</span>
              <span className="ac-stage-text">
                <span className="ac-stage-num">{stage.step}</span>
                {stage.title}
              </span>
            </button>
          )
          return (
            <li key={stage.step} style={{ '--sim-accent': stage.accent }}>
              {/* Signed out, tapping a stage is what makes someone want an
                  account, so it opens sign-up rather than doing nothing. */}
              {signedIn ? row : <SignUpButton mode="modal">{row}</SignUpButton>}
            </li>
          )
        })}
      </ol>

      {signedIn ? (
        <>
          <label className="ac-notify">
            <input
              type="checkbox"
              checked={!!progress?.notify}
              onChange={(e) => onSetNotify(e.target.checked)}
            />
            <span>Email me a nudge when I stall for a week</span>
          </label>
          <p className="ac-since">
            {count === PATH.length
              ? 'All three stages done. Pick a competition next.'
              : `${PATH.length - count} of ${PATH.length} stages to go.`}
          </p>
        </>
      ) : (
        <>
          <SignUpButton mode="modal">
            <button type="button" className="ac-track-cta">Sign up to save progress</button>
          </SignUpButton>
          <p className="ac-since">Free, and your progress follows you between devices.</p>
        </>
      )}
    </aside>
  )
}

function Ring({ pct, muted }) {
  const R = 22
  const C = 2 * Math.PI * R
  return (
    <svg className={`ac-ring${muted ? ' ac-ring-muted' : ''}`} viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <circle cx="28" cy="28" r={R} className="ac-ring-bg" />
      <circle
        cx="28"
        cy="28"
        r={R}
        className="ac-ring-fg"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - pct / 100)}
      />
      <text x="28" y="28" className="ac-ring-label">{pct}%</text>
    </svg>
  )
}

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
    <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
