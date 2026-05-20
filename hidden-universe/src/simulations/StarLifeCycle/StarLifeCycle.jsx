import './StarLifeCycle.css'

// Shared three-tab nav for the simulation switcher
function SimTypeBar({ onSwitchSim }) {
  return (
    <div className="sim-type-bar">
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('darkMatter')}>
        <span className="sim-type-icon">◉</span>Dark Matter
      </button>
      <button type="button" className="sim-type-tab"
        onClick={() => onSwitchSim?.('blackHole')}>
        <span className="sim-type-icon">⬡</span>Kerr Black Hole
      </button>
      <button type="button" className="sim-type-tab sim-type-tab-active">
        <span className="sim-type-icon">✦</span>Star Life Cycle
      </button>
    </div>
  )
}

export default function StarLifeCycle({ onSwitchSim }) {
  return (
    <div className="slc-sim">
      <SimTypeBar onSwitchSim={onSwitchSim} />
      <div className="slc-placeholder">
        <h1>Star Life Cycle</h1>
        <p>Simulation coming soon — protostar, main sequence, red giant, supernova, remnant.</p>
      </div>
    </div>
  )
}
