import { HaloCharts } from './HaloCharts'

function SliderRow({ label, hint, min, max, step, value, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="sim-slider-row">
      <div className="sim-slider-head">
        <span className="sim-slider-label">{label}</span>
        <span className="sim-slider-val">{format ? format(value) : value}</span>
      </div>
      <div className="sim-slider-track-wrap">
        <input
          type="range"
          className="sim-slider"
          style={{ '--pct': `${pct}%` }}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      {hint ? <p className="sim-slider-hint">{hint}</p> : null}
    </div>
  )
}

function IntroTab() {
  return (
    <div className="sim-tab-content">
      <section className="sim-panel">
        <h2 className="sim-panel-title">What is dark matter?</h2>
        <p className="sim-body-text">
          Dark matter is an invisible substance that makes up about 27% of the universe.
          It doesn't emit, absorb, or reflect light — we can only detect it through its
          gravitational effects on visible matter.
        </p>
      </section>
      <section className="sim-panel">
        <h2 className="sim-panel-title">What am I seeing?</h2>
        <p className="sim-body-text">
          The glowing particles are stars and gas in a spiral galaxy like the Milky Way.
          The faint red-violet cloud surrounding the galaxy is its dark matter halo —
          an enormous invisible sphere of mass that extends far beyond the visible disk.
        </p>
      </section>
      <section className="sim-panel">
        <h2 className="sim-panel-title">Why do we believe it exists?</h2>
        <p className="sim-body-text">
          Stars at the outer edges of galaxies orbit too fast. By Newton's laws, they
          should slow down as they get farther from the galactic center — just like outer
          planets in our solar system. Instead, rotation curves stay flat, implying a
          huge invisible mass surrounding the galaxy.
        </p>
      </section>
      <section className="sim-panel">
        <h2 className="sim-panel-title">The core-cusp problem</h2>
        <p className="sim-body-text">
          Computer simulations predict dark matter halos should have a sharp density spike
          at the center (a "cusp"). But observations of real galaxies often show a flat
          central density (a "core"). The NFW and Isothermal profiles in the Simulate tab
          represent these two competing models.
        </p>
      </section>
    </div>
  )
}

function SimulateTab({
  model, onModelChange,
  densityFactor, onDensityFactorChange,
  scaleRadiusKpc, onScaleRadiusChange,
  velocityScale, onVelocityScaleChange,
  series
}) {
  const modelLabel = model === 'nfw'
    ? 'Navarro–Frenk–White — cusp at center, widespread in cosmological simulations.'
    : 'Pseudo-isothermal sphere — finite core density; motivates flat rotation curves.'

  return (
    <>
      <section className="sim-panel">
        <h2 className="sim-panel-title">Halo profile</h2>
        <div className="sim-segmented" role="tablist">
          {['nfw', 'isothermal'].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={model === v}
              className={`sim-segment-btn${model === v ? ' sim-segment-btn-active' : ''}`}
              onClick={() => onModelChange(v)}
            >
              {v === 'nfw' ? 'NFW' : 'Isothermal'}
            </button>
          ))}
        </div>
        <p className="sim-model-note">{modelLabel}</p>

        <SliderRow
          label="Dark matter density scale"
          hint="Scales characteristic density ρ — raises enclosed mass and rotation speeds."
          min={0.2} max={5} step={0.01}
          value={densityFactor} onChange={onDensityFactorChange}
          format={(v) => `${v.toFixed(2)}×`}
        />
        <SliderRow
          label={model === 'nfw' ? 'Scale radius rₛ' : 'Core radius r꜀'}
          hint={model === 'nfw'
            ? 'Where density rolls over in the NFW profile.'
            : 'Core radius of the pseudo-isothermal profile.'}
          min={4} max={32} step={0.25}
          value={scaleRadiusKpc} onChange={onScaleRadiusChange}
          format={(v) => `${v.toFixed(2)} kpc`}
        />
        <SliderRow
          label="Circular speed scaling"
          hint="Multiplies √(GM/R) from this halo-only model."
          min={0.65} max={1.35} step={0.005}
          value={velocityScale} onChange={onVelocityScaleChange}
          format={(v) => `${v.toFixed(3)}×`}
        />

        <dl className="sim-summary">
          <div>
            <dt>Peak rotation (model)</dt>
            <dd>{series?.peakVc != null ? `${series.peakVc.toFixed(1)} km/s` : '—'}</dd>
          </div>
          <div>
            <dt>Mass enclosed at outer radius</dt>
            <dd>
              {series?.mencOuterMsun != null ? (
                <>{(series.mencOuterMsun / 1e10).toFixed(2)}<span className="sim-summary-unit"> ×10¹⁰ M☉</span></>
              ) : '—'}
            </dd>
          </div>
        </dl>
      </section>
    </>
  )
}

function AdvancedTab({
  showRotationCurve, onToggleRotationCurve,
  rcMassFactor, onRcMassFactorChange,
  rcScaleKpc, onRcScaleKpcChange,
  showLightRay, onToggleLightRay,
}) {
  const showSliders = showRotationCurve || showLightRay

  return (
    <div className="sim-tab-content">
      <section className="sim-panel">
        <h2 className="sim-panel-title">Baryonic Rotation Curves</h2>
        {showSliders && (
          <>
            <SliderRow
              label="Mass Scale"
              hint="Scales halo characteristic density — increases enclosed mass and rotation speed."
              min={0.2} max={5} step={0.01}
              value={rcMassFactor}
              onChange={onRcMassFactorChange}
              format={(v) => `${v.toFixed(2)}×`}
            />
            <SliderRow
              label="Scale radius"
              hint="Controls where the density profile rolls over (NFW) or flattens (isothermal)."
              min={4} max={32} step={0.25}
              value={rcScaleKpc}
              onChange={onRcScaleKpcChange}
              format={(v) => `${v.toFixed(1)} kpc`}
            />
          </>
        )}
        <label className="sim-rc-toggle">
          <input
            type="checkbox"
            checked={showRotationCurve}
            onChange={(e) => onToggleRotationCurve(e.target.checked)}
          />
          <span>Show 3D rotation curve</span>
        </label>
        {showRotationCurve && (
          <div className="sim-rc-legend">
            <span className="sim-rc-swatch sim-rc-swatch-model" />
            <span className="sim-rc-legend-label">Baryonic only</span>
            <span className="sim-rc-swatch sim-rc-swatch-mw" />
            <span className="sim-rc-legend-label">Observed</span>
          </div>
        )}
        <label className="sim-rc-toggle" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={showLightRay}
            onChange={(e) => onToggleLightRay(e.target.checked)}
          />
          <span>Show light ray</span>
        </label>
        {showLightRay && (
          <p className="sim-body-text" style={{ marginTop: 8 }}>
            Deflection angle α = 4GM/c²b (GR formula). The beam bends toward the
            galactic center — increasing mass or decreasing scale radius amplifies
            the effect. Exaggerated ×50 000 for visibility.
          </p>
        )}
      </section>
    </div>
  )
}

function PhysicsTab({ series }) {
  return (
    <div className="sim-tab-content">
      <section className="sim-panel">
        <h2 className="sim-panel-title">NFW density profile</h2>
        <div className="sim-equation-block">
          <span className="sim-eq-rho">ρ</span>
          <span className="sim-eq-paren">(r)</span>
          <span className="sim-eq-equals"> = </span>
          <div className="sim-eq-fraction">
            <span className="sim-eq-num">ρ₀</span>
            <span className="sim-eq-bar" />
            <span className="sim-eq-den">
              <span className="sim-eq-paren">(</span>r<span className="sim-eq-slash">/</span>r<span className="sim-eq-sub">s</span>
              <span className="sim-eq-paren">)</span>
              <span className="sim-eq-paren">(</span>1 + r<span className="sim-eq-slash">/</span>r<span className="sim-eq-sub">s</span>
              <span className="sim-eq-paren">)</span><span className="sim-eq-sup">2</span>
            </span>
          </div>
        </div>
        <p className="sim-body-text">
          Diverges as r → 0, producing a central density cusp. Predicted by cold dark
          matter N-body simulations.
        </p>
      </section>
      <section className="sim-panel">
        <h2 className="sim-panel-title">Pseudo-isothermal profile</h2>
        <div className="sim-equation-block">
          <span className="sim-eq-rho">ρ</span>
          <span className="sim-eq-paren">(r)</span>
          <span className="sim-eq-equals"> = </span>
          <div className="sim-eq-fraction">
            <span className="sim-eq-num">ρ₀</span>
            <span className="sim-eq-bar" />
            <span className="sim-eq-den">
              1 + <span className="sim-eq-paren">(</span>r<span className="sim-eq-slash">/</span>r<span className="sim-eq-sub">c</span>
              <span className="sim-eq-paren">)</span><span className="sim-eq-sup">2</span>
            </span>
          </div>
        </div>
        <p className="sim-body-text">
          Flattens to a finite constant ρ₀ as r → 0, producing a central core.
          Better fits observed rotation curves of dwarf galaxies.
        </p>
      </section>
      <section className="sim-panel sim-panel-charts">
        <h2 className="sim-panel-title">Diagnostics</h2>
        <HaloCharts series={series} />
      </section>
    </div>
  )
}

const TABS = ['Intro', 'Simulate', 'Advanced', 'Physics']

export default function SimulationSidebar({
  activeTab,
  collapsed,
  onTabChange,
  onClose,
  model,
  onModelChange,
  densityFactor,
  onDensityFactorChange,
  scaleRadiusKpc,
  onScaleRadiusChange,
  velocityScale,
  onVelocityScaleChange,
  series,
  showRotationCurve,
  onToggleRotationCurve,
  rcMassFactor,
  onRcMassFactorChange,
  rcScaleKpc,
  onRcScaleKpcChange,
  showLightRay,
  onToggleLightRay,
}) {
  const stopWheelBubble = (e) => e.stopPropagation()

  if (collapsed) {
    return (
      <aside className="sim-sidebar sim-sidebar-collapsed" onWheel={stopWheelBubble}>
        <div className="sim-sidebar-rail">
          <span className="sim-sidebar-rail-label" aria-hidden="true">Sidebar</span>
        </div>
      </aside>
    )
  }

  return (
    <aside className="sim-sidebar" onWheel={stopWheelBubble}>
      <header className="sim-sidebar-head">
        <div className="sim-sidebar-header-row">
          <p className="sim-eyebrow">Hidden Universe</p>
          <button
            type="button"
            className="sim-sidebar-tool-btn sim-sidebar-tool-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="sim-tab-strip" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`sim-tab-btn${activeTab === tab ? ' sim-tab-btn-active' : ''}`}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'Intro' && <IntroTab />}
      {activeTab === 'Simulate' && (
        <SimulateTab
          model={model}
          onModelChange={onModelChange}
          densityFactor={densityFactor}
          onDensityFactorChange={onDensityFactorChange}
          scaleRadiusKpc={scaleRadiusKpc}
          onScaleRadiusChange={onScaleRadiusChange}
          velocityScale={velocityScale}
          onVelocityScaleChange={onVelocityScaleChange}
          series={series}
        />
      )}
      {activeTab === 'Advanced' && (
        <AdvancedTab
          showRotationCurve={showRotationCurve}
          onToggleRotationCurve={onToggleRotationCurve}
          rcMassFactor={rcMassFactor}
          onRcMassFactorChange={onRcMassFactorChange}
          rcScaleKpc={rcScaleKpc}
          onRcScaleKpcChange={onRcScaleKpcChange}
          showLightRay={showLightRay}
          onToggleLightRay={onToggleLightRay}
        />
      )}
      {activeTab === 'Physics' && <PhysicsTab series={series} />}


    </aside>
  )
}