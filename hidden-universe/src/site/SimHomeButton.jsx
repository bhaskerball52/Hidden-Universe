import './SimHomeButton.css'

// The escape hatch back to the hub. Rendered as the first tab of every
// simulation's type bar so its position is identical across all four scenes.
export default function SimHomeButton({ onSwitchSim }) {
  return (
    <button
      type="button"
      className="sim-type-tab sim-type-home"
      onClick={() => onSwitchSim?.('home')}
      title="Back to Hidden Universe"
      aria-label="Back to Hidden Universe home"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
      </svg>
      <span className="sim-type-home-label">Home</span>
    </button>
  )
}
