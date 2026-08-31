// ---------------------------------------------------------------------------
// The topic catalogue behind the "what do you want to learn?" search.
//
// Each entry is a self-contained starting point: what the topic is, a short
// ordered plan, and the specific links to begin with — so someone can go from
// typing a word to reading the right thing without wading through a library.
//
//   id      stable key
//   name    what shows in the dropdown
//   group   dropdown section heading
//   level   Beginner | Intermediate | Advanced
//   aliases extra search terms (abbreviations, synonyms, common misspellings)
//   blurb   one or two sentences: what this actually is
//   plan    ordered steps — the route through the topic
//   links   { t: title, s: source, u: url }
//   sims    simulation keys on this site that show the topic in motion
// ---------------------------------------------------------------------------

export const TOPIC_GROUPS = [
  'Observing & the night sky',
  'Solar system & planets',
  'Stars & stellar physics',
  'Galaxies & the universe',
  'Cosmology',
  'Physics foundations',
  'Relativity & gravity',
  'Tools & data skills',
  'Competitions',
]

// Shared links, referenced from several topics.
const OPENSTAX = { t: 'Astronomy 2e', s: 'OpenStax', u: 'https://openstax.org/details/books/astronomy-2e' }
const YALE = { t: 'ASTR 160 lectures', s: 'Open Yale', u: 'https://oyc.yale.edu/astronomy/astr-160' }
const TONG = { t: 'Lecture notes (GR, cosmology, dynamics, EM, QM)', s: 'David Tong, Cambridge', u: 'https://davidtong.org/teaching/' }
const CARROLL_GR = { t: 'Lecture Notes on General Relativity', s: 'Sean Carroll', u: 'https://arxiv.org/abs/gr-qc/9712019' }
const SUSSKIND = { t: 'The Theoretical Minimum', s: 'Leonard Susskind', u: 'https://theoreticalminimum.com/courses' }
const FEYNMAN = { t: 'The Feynman Lectures on Physics', s: 'Caltech', u: 'https://www.feynmanlectures.caltech.edu/' }
const HYPERPHYSICS = { t: 'HyperPhysics', s: 'Georgia State University', u: 'http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html' }
const ASTROPY = { t: 'Astropy tutorials', s: 'Astropy Project', u: 'https://learn.astropy.org/' }
const ASTROBITES = { t: 'Astrobites', s: 'Graduate astronomers', u: 'https://astrobites.org/' }
const ADS = { t: 'NASA ADS literature search', s: 'Harvard/Smithsonian', u: 'https://ui.adsabs.harvard.edu/' }
const ARXIV = { t: 'arXiv astro-ph', s: 'Cornell University', u: 'https://arxiv.org/list/astro-ph/recent' }
const SPACETIME = { t: 'PBS Space Time', s: 'YouTube', u: 'https://www.youtube.com/@pbsspacetime' }
const STELLARIUM = { t: 'Stellarium Web planetarium', s: 'Stellarium', u: 'https://stellarium-web.org/' }
const MAST = { t: 'MAST archive (Hubble, JWST, TESS)', s: 'STScI', u: 'https://archive.stsci.edu/' }
const SDSS = { t: 'SDSS SkyServer', s: 'Sloan Digital Sky Survey', u: 'https://skyserver.sdss.org/' }
const APOD = { t: 'Astronomy Picture of the Day', s: 'NASA', u: 'https://apod.nasa.gov/apod/astropix.html' }

export const TOPICS = [
  // ---------------------------------------------------------------- observing
  {
    id: 'constellations',
    name: 'Constellations & the night sky',
    group: 'Observing & the night sky',
    level: 'Beginner',
    aliases: ['stargazing', 'asterism', 'star chart', 'naked eye', 'orion', 'ursa major', 'zodiac'],
    blurb:
      'The 88 official constellations are bookkeeping — regions of sky, not physical groupings. Learning them is how you navigate everything else.',
    plan: [
      'Learn a dozen bright anchors first (Orion, the Big Dipper, Cassiopeia, the Summer Triangle) and star-hop from them.',
      'Get outside with a planetarium app and identify what is actually overhead tonight, not what is in the book.',
      'Add the Messier objects once the patterns are automatic — that is where a small telescope starts paying off.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 2 — Observing the Sky; Ch. 1.6 for the tour of scales' },
      { id: 'mit-8-282', where: 'Opening lectures on the celestial sphere and naked-eye astronomy' },
    ],
    prereqs: { math: [], physics: [] },
    links: [
      STELLARIUM,
      { t: 'The Constellations — all 88, with boundaries', s: 'International Astronomical Union', u: 'https://www.iau.org/IAU/IAU/Astronomy-FAQs/Constellations.aspx' },
      { t: 'Deep Sky Videos — every Messier object', s: 'YouTube', u: 'https://www.youtube.com/@DeepSkyVideos' },
      { t: "This week's sky at a glance", s: 'Sky & Telescope', u: 'https://skyandtelescope.org/observing/sky-at-a-glance/' },
    ],
  },
  {
    id: 'celestial-coordinates',
    name: 'Celestial coordinates & time',
    group: 'Observing & the night sky',
    level: 'Beginner',
    aliases: ['right ascension', 'declination', 'altazimuth', 'sidereal time', 'epoch', 'j2000', 'precession'],
    blurb:
      'Right ascension, declination, hour angle, sidereal time. Unglamorous, and every observing or olympiad problem assumes you already have it.',
    plan: [
      'Nail the equatorial system (RA/dec) and why it is fixed to the sky rather than the ground.',
      'Learn to convert to alt-az for a given time and latitude — this is the classic exam question.',
      'Understand precession and why coordinates carry an epoch like J2000.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 2.1–2.3 (celestial sphere, coordinates); Ch. 4 for time and seasons' },
      { id: 'mit-8-282', where: 'Lectures on coordinates, time and the celestial sphere' },
      { id: 'khan-trig', where: 'Unit on the unit circle and spherical/angle relations' },
    ],
    prereqs: { math: ['trigonometry'], physics: [] },
    links: [
      OPENSTAX,
      { t: 'Coordinates and time in Astropy', s: 'Astropy Project', u: 'https://docs.astropy.org/en/stable/coordinates/' },
      STELLARIUM,
    ],
  },
  {
    id: 'telescopes-optics',
    name: 'Telescopes & optics',
    group: 'Observing & the night sky',
    level: 'Beginner',
    aliases: ['refractor', 'reflector', 'aperture', 'focal length', 'resolving power', 'seeing', 'diffraction limit'],
    blurb:
      'Aperture, focal ratio, magnification, and the diffraction limit — what a telescope can and cannot show you, and why bigger really is better.',
    plan: [
      'Work out the relationships between aperture, focal length, magnification and field of view.',
      'Derive the Rayleigh criterion and compare it against real atmospheric seeing.',
      'Compare designs — refractor, Newtonian, Cassegrain — and what each trades away.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 6 — Astronomical Instruments (all of it)' },
      { id: 'khan-physics', where: 'Geometric optics: lenses, mirrors, diffraction' },
      { id: 'mit-8-03', where: 'Lectures on optics, interference and diffraction' },
    ],
    prereqs: { math: ['algebra-2'], physics: ['conceptual-physics'] },
    links: [
      OPENSTAX,
      HYPERPHYSICS,
      { t: 'How Webb works — optics and instruments', s: 'STScI', u: 'https://webbtelescope.org/contents/articles/how-does-webb-work' },
    ],
  },
  {
    id: 'astrophotography',
    name: 'Astrophotography',
    group: 'Observing & the night sky',
    level: 'Intermediate',
    aliases: ['imaging', 'stacking', 'dslr', 'ccd', 'cmos', 'dark frame', 'flat field', 'narrowband'],
    blurb:
      'Long exposures, calibration frames, and stacking. The processing is where most of the signal comes from — and where most beginners go wrong.',
    plan: [
      'Start untracked and wide-field: a tripod, a fast lens, and stacking software.',
      'Learn the calibration frames — bias, dark, flat — and what artefact each one removes.',
      'Move to tracked, guided exposures and narrowband filters once the basics are boring.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 6.3–6.5 — detectors, CCDs and observing conditions' },
      { id: 'astropy-learn', where: 'The FITS-file and image-viewing tutorials' },
    ],
    prereqs: { math: ['algebra-2'], physics: ['conceptual-physics'] },
    links: [
      { t: 'Astrophotography guides', s: 'Sky & Telescope', u: 'https://skyandtelescope.org/astronomy-resources/astrophotography-tips/' },
      ASTROPY,
      APOD,
    ],
  },
  {
    id: 'spectroscopy',
    name: 'Spectroscopy',
    group: 'Observing & the night sky',
    level: 'Intermediate',
    aliases: ['spectra', 'emission lines', 'absorption lines', 'doppler shift', 'redshift', 'balmer', 'spectral classification'],
    blurb:
      'Nearly everything we know about anything beyond the solar system came from splitting its light. Composition, temperature, velocity, and distance all live in the spectrum.',
    plan: [
      'Learn why atoms emit and absorb at fixed wavelengths, and what Kirchhoff’s laws predict.',
      'Read stellar spectral classes off real spectra (OBAFGKM) and connect them to temperature.',
      'Measure a Doppler shift yourself from archive data and turn it into a velocity.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 5 — Radiation and Spectra; Ch. 17 — Analyzing Starlight' },
      { id: 'openstax-physics-3', where: 'Chapters on atomic structure and photons' },
      { id: 'mit-8-282', where: 'Lectures on radiation, spectra and stellar classification' },
    ],
    prereqs: { math: ['algebra-2'], physics: ['modern-physics'] },
    links: [
      OPENSTAX,
      SDSS,
    ],
  },
  {
    id: 'photometry',
    name: 'Photometry & magnitudes',
    group: 'Observing & the night sky',
    level: 'Intermediate',
    aliases: ['apparent magnitude', 'absolute magnitude', 'flux', 'luminosity', 'colour index', 'bolometric', 'distance modulus'],
    blurb:
      'The magnitude scale is backwards, logarithmic, and inescapable. Distance modulus and colour indices come straight out of it.',
    plan: [
      'Get comfortable with the magnitude definition and the 2.512 factor before anything else.',
      'Use the distance modulus to convert between apparent and absolute magnitude.',
      'Build a colour–magnitude diagram from real cluster photometry.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 17.1–17.3 (magnitudes, colour); Ch. 19 for distance modulus' },
      { id: 'mit-8-282', where: 'Lectures on brightness, magnitudes and luminosity' },
    ],
    prereqs: { math: ['algebra-2'], physics: ['mechanics-algebra'] },
    links: [OPENSTAX, ASTROPY, SDSS],
  },
  {
    id: 'distance-ladder',
    name: 'The cosmic distance ladder',
    group: 'Observing & the night sky',
    level: 'Intermediate',
    aliases: ['parallax', 'cepheid', 'standard candle', 'type ia', 'tully fisher', 'gaia', 'hubble constant'],
    blurb:
      'Every cosmic distance is calibrated against the rung below it, starting from parallax. Understanding the ladder is understanding why the Hubble tension is hard.',
    plan: [
      'Start with parallax and the definition of the parsec — the only rung measured geometrically.',
      'Work up through Cepheids and Type Ia supernovae as standard candles.',
      'Read about the Hubble tension and where in the ladder the disagreement could hide.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 19 — Celestial Distances; Ch. 26.3 for the extragalactic rungs' },
      { id: 'yale-astr160', where: 'Lectures on parallax, standard candles and the Hubble constant' },
      { id: 'mit-8-282', where: 'Lectures on distance determination' },
    ],
    prereqs: { math: ['trigonometry'], physics: ['intro-astronomy'] },
    links: [
      OPENSTAX,
      { t: 'Gaia mission and parallax data', s: 'ESA', u: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia' },
      ASTROBITES,
    ],
  },

  // ----------------------------------------------------------- solar system
  {
    id: 'planetary-astrophysics',
    name: 'Planetary astrophysics',
    group: 'Solar system & planets',
    level: 'Intermediate',
    aliases: ['planetary science', 'planets', 'terrestrial', 'gas giant', 'interior structure', 'differentiation'],
    blurb:
      'How planets form, differentiate, and hold onto atmospheres — and why the same physics produces Mercury and Jupiter from one disk.',
    plan: [
      'Learn core accretion and the frost line — why rocky planets are inside and giants outside.',
      'Work through hydrostatic equilibrium and interior structure for a rocky vs. gaseous body.',
      'Compare escape velocity against thermal velocity to predict which atmospheres survive.',
    ],
    courses: [
      { id: 'mit-8-901', where: 'Lectures on planetary interiors and atmospheres' },
      { id: 'yale-astr160', where: 'Early lectures on planetary formation and structure' },
      { id: 'openstax-astro', where: 'Ch. 7–12 (solar system survey); Ch. 14 for formation' },
    ],
    prereqs: { math: ['calculus-2'], physics: ['mechanics-calculus', 'thermodynamics'] },
    links: [
      OPENSTAX,
      { t: 'NASA Science — planets', s: 'NASA', u: 'https://science.nasa.gov/solar-system/planets/' },
      YALE,
    ],
  },
  {
    id: 'orbital-mechanics',
    name: 'Orbital mechanics',
    group: 'Solar system & planets',
    level: 'Intermediate',
    aliases: ['celestial mechanics', 'kepler', 'two body problem', 'orbital elements', 'transfer orbit', 'hohmann', 'delta v', 'n-body', 'lagrange points'],
    blurb:
      "Kepler's laws, the vis-viva equation, and transfer orbits. The most directly useful maths in all of astronomy, and a guaranteed olympiad topic.",
    plan: [
      "Derive Kepler's three laws from the inverse-square force — do not just memorise them.",
      'Learn the vis-viva equation and use it for Hohmann transfers and escape trajectories.',
      'Simulate a system numerically and watch the orbital elements drift under perturbation.',
    ],
    courses: [
      { id: 'mit-8-01', where: 'Units on central forces, angular momentum and gravitation' },
      { id: 'mit-8-223', where: 'The whole course — Lagrangian treatment of orbits' },
      { id: 'susskind', where: 'Classical Mechanics — the central-force and orbit lectures' },
      { id: 'yale-phys200', where: 'Lectures on Newtonian gravity and Kepler’s laws' },
    ],
    prereqs: { math: ['calculus-2'], physics: ['mechanics-calculus'] },
    links: [
      SUSSKIND,
      { t: 'REBOUND — N-body integrator', s: 'Rein & Liu', u: 'https://rebound.readthedocs.io/' },
      { t: 'JPL Horizons ephemerides', s: 'NASA/JPL', u: 'https://ssd.jpl.nasa.gov/horizons/' },
      { t: 'Eyes on the Solar System', s: 'NASA/JPL', u: 'https://eyes.nasa.gov/apps/solar-system/' },
    ],
  },
  {
    id: 'exoplanets',
    name: 'Exoplanets',
    group: 'Solar system & planets',
    level: 'Intermediate',
    aliases: ['transit method', 'radial velocity', 'hot jupiter', 'habitable zone', 'tess', 'kepler mission', 'direct imaging'],
    blurb:
      'Nearly 6,000 confirmed planets, almost all found by two techniques. Both are simple enough to work through by hand and then repeat on real data.',
    plan: [
      'Understand transit and radial-velocity detection, and what each one measures (radius vs. minimum mass).',
      'Learn the selection biases — why we found hot Jupiters first, and what we are still blind to.',
      'Pull a real TESS light curve and fit the transit depth yourself.',
    ],
    courses: [
      { id: 'mit-12-425', where: 'The whole course; start with the transit and radial-velocity lectures' },
      { id: 'yale-astr160', where: 'The first third — exoplanet detection methods' },
      { id: 'openstax-astro', where: 'Ch. 21.4–21.6 — planets outside the solar system' },
    ],
    prereqs: { math: ['calculus-1'], physics: ['mechanics-calculus'] },
    links: [
      { t: 'NASA Exoplanet Archive', s: 'NASA/IPAC', u: 'https://exoplanetarchive.ipac.caltech.edu/' },
      MAST,
      ASTROPY,
      YALE,
    ],
  },
  {
    id: 'small-bodies',
    name: 'Asteroids, comets & small bodies',
    group: 'Solar system & planets',
    level: 'Beginner',
    aliases: ['kuiper belt', 'oort cloud', 'meteor', 'meteorite', 'trans neptunian', 'near earth object', 'impact'],
    blurb:
      'The leftovers of planet formation, and the only samples of the early solar system we can actually get our hands on.',
    plan: [
      'Map the populations — main belt, Trojans, Kuiper belt, Oort cloud — and what dynamically separates them.',
      'Learn how orbits are determined from a handful of observations.',
      'Follow a current sample-return mission and what its results changed.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 13 — Comets and Asteroids; Ch. 14 for meteorites' },
      { id: 'mit-8-282', where: 'Lectures on solar-system debris' },
    ],
    prereqs: { math: ['trigonometry'], physics: ['mechanics-algebra'] },
    links: [
      { t: 'Minor Planet Center', s: 'IAU', u: 'https://www.minorplanetcenter.net/' },
      { t: 'NASA Science — asteroids, comets & meteors', s: 'NASA', u: 'https://science.nasa.gov/solar-system/asteroids/' },
      OPENSTAX,
    ],
  },
  {
    id: 'astrobiology',
    name: 'Astrobiology & habitability',
    group: 'Solar system & planets',
    level: 'Beginner',
    aliases: ['life', 'seti', 'drake equation', 'biosignature', 'fermi paradox', 'extremophile', 'habitable zone'],
    blurb:
      'What life needs, where those conditions occur, and how we would detect it remotely. Rigorous where it can be, honest about where it cannot.',
    plan: [
      'Learn what sets the habitable zone and why it is a much weaker constraint than it sounds.',
      'Study biosignatures and the false positives that make them hard to claim.',
      'Work through the Drake equation as a way of organising ignorance, not predicting an answer.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 30 — Life in the Universe (all of it)' },
      { id: 'yale-astr160', where: 'The lectures on habitability and the Drake equation' },
    ],
    prereqs: { math: [], physics: ['conceptual-physics'] },
    links: [
      { t: 'NASA Astrobiology', s: 'NASA', u: 'https://astrobiology.nasa.gov/' },
      OPENSTAX,
      SPACETIME,
    ],
  },

  // ------------------------------------------------------------------- stars
  {
    id: 'stellar-structure',
    name: 'Stellar structure & evolution',
    group: 'Stars & stellar physics',
    level: 'Intermediate',
    aliases: ['hr diagram', 'main sequence', 'hertzsprung russell', 'red giant', 'hydrostatic equilibrium', 'stellar lifetime'],
    blurb:
      'Why a star is stable, what sets its lifetime, and how it moves across the HR diagram. The backbone of stellar astrophysics.',
    plan: [
      'Start with hydrostatic equilibrium and the four structure equations.',
      'Learn the mass–luminosity relation and derive why massive stars die young.',
      'Trace a 1 M☉ and a 20 M☉ star across the HR diagram and compare their endings.',
    ],
    courses: [
      { id: 'mit-8-901', where: 'Lectures on stellar structure equations and the HR diagram' },
      { id: 'openstax-astro', where: 'Ch. 15–16 (the Sun); Ch. 18 and Ch. 22 for the HR diagram and evolution' },
      { id: 'tong-notes', where: 'Astrophysics / Statistical Physics notes for the equation of state' },
    ],
    prereqs: { math: ['differential-equations'], physics: ['mechanics-calculus', 'thermodynamics'] },
    links: [OPENSTAX, YALE, TONG],
  },
  {
    id: 'star-formation',
    name: 'Star formation',
    group: 'Stars & stellar physics',
    level: 'Intermediate',
    aliases: ['molecular cloud', 'jeans mass', 'protostar', 'imf', 'nebula', 'accretion disk', 'protoplanetary'],
    blurb:
      'Collapse, fragmentation, and the initial mass function — how a cold cloud becomes a cluster of stars, and why it makes so many more small ones than large.',
    plan: [
      'Derive the Jeans criterion and see what it takes to make a cloud unstable.',
      'Follow the protostellar stages from collapse through the pre-main-sequence.',
      'Look at real star-forming regions in infrared imagery and identify the stages.',
    ],
    courses: [
      { id: 'mit-8-901', where: 'Lectures on the interstellar medium and collapse' },
      { id: 'openstax-astro', where: 'Ch. 20 — Between the Stars; Ch. 21 — The Birth of Stars' },
    ],
    prereqs: { math: ['differential-equations'], physics: ['thermodynamics'] },
    links: [
      OPENSTAX,
      { t: 'JWST star-formation images and science', s: 'ESA/Webb', u: 'https://esawebb.org/images/' },
      ASTROBITES,
    ],
  },
  {
    id: 'nucleosynthesis',
    name: 'Nucleosynthesis',
    group: 'Stars & stellar physics',
    level: 'Advanced',
    aliases: ['fusion', 'pp chain', 'cno cycle', 'triple alpha', 's-process', 'r-process', 'origin of elements'],
    blurb:
      'Where the elements come from — the pp chain, the CNO cycle, the triple-alpha bottleneck, and the neutron-capture processes that build everything past iron.',
    plan: [
      'Work through the pp chain and CNO cycle and what temperature selects between them.',
      'Understand why fusion stops at iron and what that means for massive stars.',
      'Learn the s- and r-processes, and the neutron-star merger evidence for the r-process.',
    ],
    courses: [
      { id: 'mit-8-901', where: 'Lectures on nuclear burning and stellar energy generation' },
      { id: 'mit-8-04', where: 'Barrier tunnelling — the mechanism behind the Gamow factor' },
      { id: 'openstax-physics-3', where: 'Chapters on nuclear physics and binding energy' },
    ],
    prereqs: { math: ['calculus-2'], physics: ['quantum-mechanics'] },
    links: [
      HYPERPHYSICS,
      { t: 'Gravitational-wave data from neutron-star mergers', s: 'GWOSC', u: 'https://gwosc.org/' },
      ARXIV,
    ],
  },
  {
    id: 'variable-stars',
    name: 'Variable & binary stars',
    group: 'Stars & stellar physics',
    level: 'Intermediate',
    aliases: ['cepheid', 'rr lyrae', 'eclipsing binary', 'light curve', 'period luminosity', 'cataclysmic variable', 'aavso'],
    blurb:
      'Stars that change, and stars in pairs. Between them they give us stellar masses and the distance ladder — and amateurs still contribute real data.',
    plan: [
      'Learn the main variability classes and what physically drives each one.',
      'Use an eclipsing binary light curve to extract masses and radii.',
      'Submit or analyse real observations through the AAVSO archive.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 19.3 — variable stars as distance indicators' },
      { id: 'mit-8-901', where: 'Lectures on pulsation and stellar instability' },
      { id: 'astropy-learn', where: 'The light-curve and time-series tutorials' },
    ],
    prereqs: { math: ['calculus-1'], physics: ['mechanics-calculus'] },
    links: [
      { t: 'AAVSO — variable star observing & data', s: 'AAVSO', u: 'https://www.aavso.org/' },
      MAST,
      ASTROPY,
    ],
  },
  {
    id: 'supernovae',
    name: 'Supernovae & stellar death',
    group: 'Stars & stellar physics',
    level: 'Advanced',
    aliases: ['type ia', 'core collapse', 'white dwarf', 'chandrasekhar limit', 'planetary nebula', 'remnant'],
    blurb:
      'Two completely different explosions that look superficially alike: runaway fusion on a white dwarf, and the collapse of a massive stellar core.',
    plan: [
      'Separate Type Ia from core-collapse by mechanism, spectrum and light curve.',
      'Derive the Chandrasekhar limit from degeneracy pressure.',
      'Follow how Type Ia became the standard candle behind dark energy.',
    ],
    courses: [
      { id: 'mit-8-901', where: 'Lectures on late stellar evolution and core collapse' },
      { id: 'mit-8-902', where: 'Lectures on supernovae and compact remnants' },
      { id: 'openstax-physics-3', where: 'Chapters on nuclear binding and degenerate matter' },
    ],
    prereqs: { math: ['calculus-2'], physics: ['modern-physics', 'statistical-mechanics'] },
    links: [OPENSTAX, ARXIV, SPACETIME],
    sims: ['neutronStar'],
  },
  {
    id: 'neutron-stars',
    name: 'Neutron stars & pulsars',
    group: 'Stars & stellar physics',
    level: 'Advanced',
    aliases: ['pulsar', 'magnetar', 'degeneracy pressure', 'tov limit', 'light cylinder', 'spin down', 'lighthouse model'],
    blurb:
      'A solar mass inside a city, spinning hundreds of times a second with a magnetic field a trillion times Earth’s. The densest matter we can observe.',
    plan: [
      'Start from neutron degeneracy pressure and the TOV maximum mass.',
      'Learn the magnetic dipole model and derive the spin-down luminosity.',
      'Understand the light cylinder and why the beam produces a pulse.',
    ],
    courses: [
      { id: 'mit-8-902', where: 'Lectures on neutron stars, pulsars and compact objects' },
      { id: 'carroll-gr', where: 'The Schwarzschild and black holes chapter — for the metric outside a compact star' },
      { id: 'tong-notes', where: 'General Relativity notes on stellar interiors and the TOV equation' },
    ],
    prereqs: { math: ['differential-equations'], physics: ['quantum-mechanics', 'special-relativity'] },
    links: [
      { t: 'Gravitational-wave open data', s: 'GWOSC', u: 'https://gwosc.org/' },
      ARXIV,
      SPACETIME,
    ],
    sims: ['neutronStar'],
  },

  // ---------------------------------------------------------------- galaxies
  {
    id: 'milky-way',
    name: 'The Milky Way',
    group: 'Galaxies & the universe',
    level: 'Beginner',
    aliases: ['galactic centre', 'sagittarius a', 'spiral arms', 'galactic structure', 'globular cluster', 'halo'],
    blurb:
      'The galaxy we live inside and therefore see edge-on and from within — which makes mapping it far harder than mapping any other.',
    plan: [
      'Learn the components: thin disk, thick disk, bulge, bar, halo, and where the Sun sits.',
      'Follow how the spiral structure was mapped despite our position inside it.',
      'Study Sgr A* and the stellar orbits that proved it is a supermassive black hole.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 25 — The Milky Way Galaxy (all of it)' },
      { id: 'yale-astr160', where: 'Lectures on the galactic centre and Sgr A*' },
      { id: 'mit-8-902', where: 'Lectures on galactic structure and dynamics' },
    ],
    prereqs: { math: ['calculus-1'], physics: ['intro-astronomy'] },
    links: [
      OPENSTAX,
      { t: 'Event Horizon Telescope — Sgr A*', s: 'EHT Collaboration', u: 'https://eventhorizontelescope.org/' },
      { t: 'Gaia — mapping the galaxy', s: 'ESA', u: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia' },
    ],
  },
  {
    id: 'galaxy-evolution',
    name: 'Galaxy formation & evolution',
    group: 'Galaxies & the universe',
    level: 'Advanced',
    aliases: ['hubble sequence', 'merger', 'elliptical', 'spiral galaxy', 'starburst', 'morphology', 'feedback'],
    blurb:
      'How galaxies assemble from small structures, merge, and quench. JWST has been busy complicating the standard picture.',
    plan: [
      'Learn the Hubble sequence as description, then why it is not an evolutionary track.',
      'Study hierarchical assembly and what mergers do to morphology.',
      'Read what JWST found at high redshift and why early massive galaxies are a problem.',
    ],
    courses: [
      { id: 'mit-8-902', where: 'Lectures on galaxy formation, mergers and feedback' },
      { id: 'tong-notes', where: 'Cosmology notes on structure formation' },
    ],
    prereqs: { math: ['calculus-2'], physics: ['classical-mechanics'] },
    links: [
      { t: 'JWST deep-field science releases', s: 'ESA/Webb', u: 'https://esawebb.org/images/' },
      ASTROBITES,
      ARXIV,
    ],
  },
  {
    id: 'dark-matter',
    name: 'Dark matter & rotation curves',
    group: 'Galaxies & the universe',
    level: 'Intermediate',
    aliases: ['nfw', 'halo', 'rotation curve', 'mond', 'wimp', 'core cusp', 'bullet cluster', 'missing mass'],
    blurb:
      'Galaxies rotate far too fast at their edges for the matter we can see. Five times more mass than we can account for, detected only by its gravity.',
    plan: [
      'Derive the Keplerian falloff you would expect, then look at a real rotation curve.',
      'Compare halo profiles — NFW vs. pseudo-isothermal — and the core–cusp problem between them.',
      'Weigh the evidence beyond rotation curves: lensing, the CMB, and the Bullet Cluster.',
    ],
    courses: [
      { id: 'mit-8-902', where: 'Lectures on galactic dynamics and rotation curves' },
      { id: 'yale-astr160', where: 'The dark-matter lectures — rotation curves and evidence' },
      { id: 'mit-8-286', where: 'Lectures on the matter budget of the universe' },
    ],
    prereqs: { math: ['calculus-2'], physics: ['mechanics-calculus'] },
    links: [SDSS, ARXIV, SPACETIME, ASTROBITES],
    sims: ['darkMatter'],
  },
  {
    id: 'agn-quasars',
    name: 'Active galactic nuclei & quasars',
    group: 'Galaxies & the universe',
    level: 'Advanced',
    aliases: ['quasar', 'blazar', 'seyfert', 'accretion disk', 'relativistic jet', 'eddington limit', 'supermassive black hole'],
    blurb:
      'Supermassive black holes accreting hard enough to outshine their entire host galaxy, and the unified model that ties the zoo of names together.',
    plan: [
      'Learn the Eddington limit and what sets the maximum steady accretion luminosity.',
      'Work through the unified model — one object, different viewing angles.',
      'Study relativistic jets and how beaming produces apparent superluminal motion.',
    ],
    courses: [
      { id: 'mit-8-902', where: 'Lectures on accretion, AGN and jets' },
      { id: 'carroll-gr', where: 'The black holes chapter — horizons, ISCO and the ergosphere' },
    ],
    prereqs: { math: ['multivariable-calculus'], physics: ['special-relativity', 'electrodynamics'] },
    links: [
      { t: 'Event Horizon Telescope — M87*', s: 'EHT Collaboration', u: 'https://eventhorizontelescope.org/' },
      ARXIV,
      SPACETIME,
    ],
    sims: ['blackHole'],
  },
  {
    id: 'gravitational-lensing',
    name: 'Gravitational lensing',
    group: 'Galaxies & the universe',
    level: 'Advanced',
    aliases: ['einstein ring', 'strong lensing', 'weak lensing', 'microlensing', 'caustic', 'magnification', 'time delay'],
    blurb:
      'Mass bends light, so galaxies act as telescopes. It is how we weigh dark matter and how we see galaxies that would otherwise be far too faint.',
    plan: [
      'Derive the deflection angle in the weak-field limit — note the factor of two over the Newtonian answer.',
      'Learn strong, weak and microlensing regimes and what each is used to measure.',
      'Look at real JWST cluster lenses and identify the multiple images.',
    ],
    courses: [
      { id: 'carroll-gr', where: 'The weak fields chapter (deflection of light) and the Schwarzschild chapter' },
      { id: 'mit-8-962', where: 'Lectures on the weak-field limit and light bending' },
      { id: 'tong-notes', where: 'General Relativity notes — the geodesic and weak-field sections' },
    ],
    prereqs: { math: ['tensor-calculus'], physics: ['general-relativity'] },
    links: [CARROLL_GR, { t: 'JWST lensing cluster images', s: 'ESA/Webb', u: 'https://esawebb.org/images/' }, ARXIV],
    sims: ['darkMatter', 'blackHole'],
  },

  // --------------------------------------------------------------- cosmology
  {
    id: 'big-bang',
    name: 'Big Bang & the expanding universe',
    group: 'Cosmology',
    level: 'Intermediate',
    aliases: ['hubble law', 'expansion', 'redshift', 'scale factor', 'friedmann', 'age of the universe', 'lambda cdm'],
    blurb:
      'The expansion, its history, and the Friedmann equations that govern it. Note that space expands — galaxies are not flying through it.',
    plan: [
      "Get Hubble's law and the scale factor straight, including why cosmological redshift is not Doppler.",
      'Work through the Friedmann equations and what each density component does to the expansion.',
      'Trace the thermal history from the first second to recombination.',
    ],
    courses: [
      { id: 'mit-8-286', where: 'Lectures 1–8 — expansion, the Friedmann equations and thermal history' },
      { id: 'tong-notes', where: 'Cosmology notes, opening chapters on the expanding universe' },
      { id: 'yale-astr160', where: 'The final third — cosmology and the expanding universe' },
    ],
    prereqs: { math: ['differential-equations'], physics: ['special-relativity'] },
    links: [
      { t: 'MIT 8.286 — The Early Universe', s: 'MIT OpenCourseWare', u: 'https://ocw.mit.edu/courses/8-286-the-early-universe-fall-2013/' },
      { t: 'Cosmology tutorial', s: 'Ned Wright, UCLA', u: 'https://www.astro.ucla.edu/~wright/cosmolog.htm' },
      TONG,
    ],
  },
  {
    id: 'cmb',
    name: 'The cosmic microwave background',
    group: 'Cosmology',
    level: 'Advanced',
    aliases: ['recombination', 'last scattering', 'planck', 'wmap', 'acoustic peaks', 'anisotropy', 'power spectrum'],
    blurb:
      'The oldest light there is, from 380,000 years after the Big Bang. Its temperature fluctuations encode almost every cosmological parameter we know.',
    plan: [
      'Understand recombination and why the universe became transparent when it did.',
      'Learn to read the angular power spectrum and what each acoustic peak constrains.',
      'See how the CMB independently confirms the dark matter and dark energy densities.',
    ],
    courses: [
      { id: 'mit-8-286', where: 'Lectures on recombination, decoupling and the CMB' },
      { id: 'tong-notes', where: 'Cosmology notes on recombination and CMB anisotropies' },
    ],
    prereqs: { math: ['fourier-analysis'], physics: ['statistical-mechanics', 'special-relativity'] },
    links: [
      { t: 'Planck mission results', s: 'ESA', u: 'https://www.esa.int/Science_Exploration/Space_Science/Planck' },
      { t: 'MIT 8.286 — The Early Universe', s: 'MIT OpenCourseWare', u: 'https://ocw.mit.edu/courses/8-286-the-early-universe-fall-2013/' },
      TONG,
    ],
  },
  {
    id: 'dark-energy',
    name: 'Dark energy & the fate of the universe',
    group: 'Cosmology',
    level: 'Advanced',
    aliases: ['cosmological constant', 'lambda', 'accelerating expansion', 'quintessence', 'equation of state', 'big rip'],
    blurb:
      'The expansion is accelerating, and roughly 70% of the energy budget is something we can only describe by its effect. The largest open problem in physics.',
    plan: [
      'Follow the Type Ia supernova result that established acceleration.',
      'Learn the equation-of-state parameter w and what measuring it would settle.',
      'Compare the cosmological constant against the alternatives, and the fine-tuning problem.',
    ],
    courses: [
      { id: 'mit-8-286', where: 'Lectures on the cosmological constant and acceleration' },
      { id: 'carroll-gr', where: 'The cosmology chapter — the Friedmann equations with Λ' },
      { id: 'tong-notes', where: 'Cosmology notes on the dark-energy equation of state' },
    ],
    prereqs: { math: ['differential-equations'], physics: ['general-relativity'] },
    links: [
      { t: 'MIT 8.286 — The Early Universe', s: 'MIT OpenCourseWare', u: 'https://ocw.mit.edu/courses/8-286-the-early-universe-fall-2013/' },
      ARXIV,
      SPACETIME,
    ],
  },
  {
    id: 'inflation',
    name: 'Cosmic inflation',
    group: 'Cosmology',
    level: 'Advanced',
    aliases: ['horizon problem', 'flatness problem', 'inflaton', 'e-folds', 'primordial fluctuations', 'guth'],
    blurb:
      'A brief period of exponential expansion that solves the horizon and flatness problems and seeds structure. Well motivated, still not directly confirmed.',
    plan: [
      'Understand the horizon and flatness problems inflation was invented to solve.',
      'Learn how quantum fluctuations get stretched into the seeds of structure.',
      'Follow the search for primordial B-mode polarisation and why it is so hard.',
    ],
    courses: [
      { id: 'mit-8-286', where: 'Guth’s own lectures on inflation, near the end of the course' },
      { id: 'tong-notes', where: 'Cosmology notes — the inflation chapter' },
    ],
    prereqs: { math: ['partial-differential-equations'], physics: ['general-relativity', 'quantum-mechanics'] },
    links: [
      { t: 'MIT 8.286 — Alan Guth on inflation', s: 'MIT OpenCourseWare', u: 'https://ocw.mit.edu/courses/8-286-the-early-universe-fall-2013/' },
      TONG,
      ARXIV,
    ],
  },
  {
    id: 'large-scale-structure',
    name: 'Large-scale structure',
    group: 'Cosmology',
    level: 'Advanced',
    aliases: ['cosmic web', 'filament', 'void', 'galaxy cluster', 'baryon acoustic oscillation', 'bao', 'correlation function'],
    blurb:
      'On the largest scales the universe is a web of filaments and voids. Its statistics are one of the sharpest cosmological probes we have.',
    plan: [
      'Learn how small density perturbations grow into the cosmic web.',
      'Understand baryon acoustic oscillations as a standard ruler.',
      'Query a real galaxy redshift survey and plot the structure yourself.',
    ],
    courses: [
      { id: 'mit-8-286', where: 'Lectures on perturbation growth and structure formation' },
      { id: 'tong-notes', where: 'Cosmology notes on structure formation and the power spectrum' },
    ],
    prereqs: { math: ['fourier-analysis'], physics: ['statistical-mechanics'] },
    links: [SDSS, ARXIV, ASTROBITES],
  },

  // ------------------------------------------------------- physics foundations
  {
    id: 'newtonian-mechanics',
    name: 'Newtonian mechanics & gravity',
    group: 'Physics foundations',
    level: 'Beginner',
    aliases: ['classical mechanics', 'newton', 'inverse square', 'angular momentum', 'lagrangian', 'conservation laws', 'energy'],
    blurb:
      'Forces, energy, angular momentum, and the inverse-square law. Everything else on this page is built on top of it.',
    plan: [
      'Get conservation of energy and angular momentum solid — most orbital problems are one of the two in disguise.',
      'Learn the Lagrangian formulation; it makes the hard problems tractable.',
      'Apply it to the two-body problem and recover Kepler.',
    ],
    courses: [
      { id: 'mit-8-01', where: 'The whole course; units on energy, momentum and rotation are the core' },
      { id: 'yale-phys200', where: 'Lectures 1–12 — Newtonian mechanics through rigid bodies' },
      { id: 'openstax-physics-1', where: 'Ch. 1–14 (mechanics); Ch. 13 for gravitation' },
      { id: 'susskind', where: 'Classical Mechanics — the Lagrangian and Hamiltonian lectures' },
    ],
    prereqs: { math: ['calculus-1'], physics: ['mechanics-algebra'] },
    links: [FEYNMAN, SUSSKIND, HYPERPHYSICS],
  },
  {
    id: 'electromagnetism',
    name: 'Electromagnetism & radiation',
    group: 'Physics foundations',
    level: 'Intermediate',
    aliases: ['maxwell', 'blackbody', 'planck law', 'wien', 'stefan boltzmann', 'synchrotron', 'bremsstrahlung', 'radiative transfer'],
    blurb:
      'Light is the only messenger for almost everything in astronomy. Blackbody radiation, radiative transfer, and the emission mechanisms behind what telescopes see.',
    plan: [
      "Learn the blackbody laws — Planck, Wien, Stefan–Boltzmann — and apply them to stars.",
      'Understand optical depth and radiative transfer well enough to explain absorption lines.',
      'Study non-thermal emission: synchrotron and bremsstrahlung, and where each dominates.',
    ],
    courses: [
      { id: 'mit-8-02', where: 'The whole course; the radiation and Maxwell lectures matter most here' },
      { id: 'openstax-physics-2', where: 'The electromagnetism half — fields through Maxwell’s equations' },
      { id: 'feynman', where: 'Volume II — the electromagnetism volume, especially radiation' },
    ],
    prereqs: { math: ['vector-calculus'], physics: ['mechanics-calculus'] },
    links: [FEYNMAN, TONG, HYPERPHYSICS],
  },
  {
    id: 'thermodynamics',
    name: 'Thermodynamics & statistical mechanics',
    group: 'Physics foundations',
    level: 'Intermediate',
    aliases: ['entropy', 'boltzmann', 'maxwell boltzmann', 'ideal gas', 'degeneracy', 'equation of state', 'saha'],
    blurb:
      'Stellar interiors, planetary atmospheres and degenerate matter are all thermodynamics problems. The Saha equation alone explains stellar spectral classes.',
    plan: [
      'Get the kinetic theory and Maxwell–Boltzmann distribution down.',
      'Learn the Saha equation and use it to explain why hydrogen lines peak in A stars.',
      'Study degeneracy pressure — it is what holds up white dwarfs and neutron stars.',
    ],
    courses: [
      { id: 'mit-8-044', where: 'Lectures on kinetic theory, distributions and thermodynamic potentials' },
      { id: 'openstax-physics-2', where: 'The opening thermodynamics chapters — kinetic theory and the laws' },
      { id: 'tong-notes', where: 'Statistical Physics notes — kinetic theory and the partition function' },
    ],
    prereqs: { math: ['multivariable-calculus'], physics: ['mechanics-calculus'] },
    links: [TONG, FEYNMAN, HYPERPHYSICS],
  },
  {
    id: 'quantum-mechanics',
    name: 'Quantum mechanics',
    group: 'Physics foundations',
    level: 'Advanced',
    aliases: ['schrodinger', 'wavefunction', 'atomic structure', 'selection rules', 'pauli exclusion', 'quantum tunneling', 'spectral lines'],
    blurb:
      'Atomic structure explains every spectral line; the exclusion principle explains degeneracy pressure; tunnelling is why the Sun fuses at all.',
    plan: [
      'Solve the hydrogen atom and connect the energy levels to observed spectral series.',
      'Learn selection rules and why some transitions are forbidden — and what "forbidden" lines mean in nebulae.',
      'Study tunnelling and the Gamow factor behind stellar fusion rates.',
    ],
    courses: [
      { id: 'mit-8-04', where: 'The whole course; wavefunctions through the hydrogen atom' },
      { id: 'openstax-physics-3', where: 'The quantum chapters — photons, wavefunctions, atomic structure' },
      { id: 'tong-notes', where: 'Quantum Mechanics notes' },
      { id: 'feynman', where: 'Volume III — the quantum mechanics volume' },
    ],
    prereqs: { math: ['linear-algebra', 'partial-differential-equations'], physics: ['modern-physics'] },
    links: [FEYNMAN, TONG, HYPERPHYSICS],
  },
  {
    id: 'fluid-dynamics',
    name: 'Fluid dynamics & MHD',
    group: 'Physics foundations',
    level: 'Advanced',
    aliases: ['hydrodynamics', 'magnetohydrodynamics', 'shock', 'turbulence', 'jeans instability', 'accretion', 'plasma'],
    blurb:
      'Stars, disks, jets and the interstellar medium are all fluids — usually magnetised ones. Shocks and instabilities do most of the interesting work.',
    plan: [
      'Learn the Euler equations and the conditions for hydrostatic equilibrium.',
      'Study shocks and the Rankine–Hugoniot jump conditions, then apply them to supernova remnants.',
      'Add magnetic fields and see how MHD changes accretion and jet launching.',
    ],
    courses: [
      { id: 'tong-notes', where: 'Fluid Mechanics and Kinetic Theory notes' },
      { id: 'mit-18-303', where: 'Lectures on the wave and diffusion equations, then shocks' },
    ],
    prereqs: { math: ['partial-differential-equations', 'vector-calculus'], physics: ['classical-mechanics'] },
    links: [TONG, ARXIV, ASTROBITES],
  },

  // ------------------------------------------------------- relativity & gravity
  {
    id: 'special-relativity',
    name: 'Special relativity',
    group: 'Relativity & gravity',
    level: 'Intermediate',
    aliases: ['sr', 'lorentz transformation', 'time dilation', 'length contraction', 'four vector', 'spacetime', 'relativistic doppler', 'e=mc2'],
    blurb:
      'Two postulates, and everything else follows: time dilation, length contraction, and mass–energy equivalence. The prerequisite for general relativity.',
    plan: [
      'Derive the Lorentz transformation from the two postulates rather than memorising the results.',
      'Get comfortable with spacetime diagrams and invariant intervals — they make the paradoxes evaporate.',
      'Learn four-vectors and relativistic Doppler, then apply them to jets and beaming.',
    ],
    courses: [
      { id: 'mit-8-20', where: 'The whole course — it is a short, focused IAP course' },
      { id: 'susskind', where: 'Special Relativity and Classical Field Theory — the first lectures' },
      { id: 'yale-phys200', where: 'The relativity lectures near the end of the series' },
      { id: 'feynman', where: 'Volume I, Ch. 15–17 — relativity and spacetime' },
    ],
    prereqs: { math: ['algebra-2'], physics: ['mechanics-calculus'] },
    links: [SUSSKIND, FEYNMAN, TONG, SPACETIME],
    sims: ['blackHole'],
  },
  {
    id: 'general-relativity',
    name: 'General relativity',
    group: 'Relativity & gravity',
    level: 'Advanced',
    aliases: ['gr', 'einstein field equations', 'curvature', 'metric', 'geodesic', 'schwarzschild', 'tensor', 'equivalence principle'],
    blurb:
      'Gravity as the curvature of spacetime. Hard going, and the payoff is that black holes, lensing and cosmology all become one subject.',
    plan: [
      'Build up the tensor calculus first — most people who bounce off GR bounced off this.',
      'Get to the Schwarzschild solution and derive the event horizon and photon sphere.',
      'Work through the classic tests: perihelion precession, light deflection, gravitational redshift.',
    ],
    courses: [
      { id: 'mit-8-962', where: 'The whole course; manifolds and curvature first' },
      { id: 'carroll-gr', where: 'Ch. 1–4: special relativity, manifolds, curvature, gravitation' },
      { id: 'susskind', where: 'General Relativity — the full course' },
      { id: 'tong-notes', where: 'General Relativity notes' },
    ],
    prereqs: { math: ['tensor-calculus', 'differential-geometry'], physics: ['special-relativity', 'classical-mechanics'] },
    links: [CARROLL_GR, SUSSKIND, TONG, SPACETIME],
    sims: ['blackHole', 'wormhole'],
  },
  {
    id: 'black-holes',
    name: 'Black holes',
    group: 'Relativity & gravity',
    level: 'Advanced',
    aliases: ['event horizon', 'schwarzschild radius', 'kerr', 'isco', 'photon sphere', 'hawking radiation', 'ergosphere', 'frame dragging', 'singularity'],
    blurb:
      'Where the geometry stops being a correction and becomes the whole story. Rotating ones drag spacetime around with them.',
    plan: [
      'Start with Schwarzschild: horizon, photon sphere, ISCO, and gravitational redshift.',
      'Move to Kerr and frame-dragging, and why spin changes the ISCO so dramatically.',
      'Compare your understanding against the EHT images of M87* and Sgr A*.',
    ],
    courses: [
      { id: 'mit-8-962', where: 'The Schwarzschild and Kerr lectures' },
      { id: 'carroll-gr', where: 'The Schwarzschild solution and black holes chapter' },
      { id: 'susskind', where: 'General Relativity — the black-hole lectures' },
    ],
    prereqs: { math: ['multivariable-calculus'], physics: ['special-relativity'] },
    links: [
      CARROLL_GR,
      { t: 'Event Horizon Telescope', s: 'EHT Collaboration', u: 'https://eventhorizontelescope.org/' },
      SPACETIME,
      ARXIV,
    ],
    sims: ['blackHole'],
  },
  {
    id: 'wormholes',
    name: 'Wormholes & exotic spacetime',
    group: 'Relativity & gravity',
    level: 'Advanced',
    aliases: ['einstein rosen bridge', 'ellis metric', 'morris thorne', 'traversable', 'exotic matter', 'null energy condition', 'time travel', 'warp drive'],
    blurb:
      'Perfectly valid solutions to the field equations that would need matter with negative energy density to hold open. The maths works; the matter probably does not exist.',
    plan: [
      'Learn the Morris–Thorne metric and what "traversable" formally requires.',
      'Understand the null energy condition and why violating it is the whole problem.',
      'Look at how lensing through a throat differs from lensing around a black hole.',
    ],
    courses: [
      { id: 'carroll-gr', where: 'The Schwarzschild chapter (maximal extension) plus the energy-conditions discussion' },
      { id: 'mit-8-962', where: 'Lectures on energy conditions and exotic solutions' },
    ],
    prereqs: { math: ['tensor-calculus'], physics: ['general-relativity'] },
    links: [CARROLL_GR, SPACETIME, ARXIV],
    sims: ['wormhole'],
  },
  {
    id: 'gravitational-waves',
    name: 'Gravitational waves',
    group: 'Relativity & gravity',
    level: 'Advanced',
    aliases: ['ligo', 'virgo', 'merger', 'chirp mass', 'strain', 'interferometer', 'multi messenger', 'binary inspiral'],
    blurb:
      'Ripples in spacetime, first detected in 2015. The strain data is public, and the chirp mass really can be recovered from it with modest maths.',
    plan: [
      'Learn the quadrupole formula and why gravitational waves are so weak.',
      'Understand the inspiral chirp and how mass is extracted from frequency evolution.',
      'Download real strain data from GWOSC and work through their tutorial.',
    ],
    courses: [
      { id: 'mit-8-962', where: 'The lectures on linearised gravity and radiation' },
      { id: 'carroll-gr', where: 'The weak fields and gravitational radiation chapter' },
      { id: 'tong-notes', where: 'General Relativity notes — the gravitational-waves chapter' },
    ],
    prereqs: { math: ['tensor-calculus'], physics: ['general-relativity'] },
    links: [
      { t: 'Gravitational Wave Open Science Center', s: 'LIGO / Virgo / KAGRA', u: 'https://gwosc.org/' },
      CARROLL_GR,
      SPACETIME,
    ],
  },

  // ----------------------------------------------------------- tools & skills
  {
    id: 'python-astronomy',
    name: 'Python for astronomy',
    group: 'Tools & data skills',
    level: 'Intermediate',
    aliases: ['astropy', 'numpy', 'matplotlib', 'fits', 'coding', 'programming', 'data reduction', 'jupyter'],
    blurb:
      'The working language of the field. Astropy handles units, coordinates, cosmology and FITS files so you are not reinventing them.',
    plan: [
      'Get comfortable with NumPy and Matplotlib before anything astronomy-specific.',
      'Work through the Astropy tutorials — units and coordinates first, then FITS.',
      'Reproduce a plot from a real paper using archive data.',
    ],
    courses: [
      { id: 'mit-6-0001', where: 'Lectures 1–6 for the language; the rest is optional here' },
      { id: 'astropy-learn', where: 'Start with the units and coordinates tutorials, then FITS' },
    ],
    prereqs: { math: ['algebra-2'], physics: [] },
    links: [
      ASTROPY,
      { t: 'Astropy documentation', s: 'Astropy Project', u: 'https://www.astropy.org/' },
      { t: 'Skyfield — precise positions in Python', s: 'Brandon Rhodes', u: 'https://rhodesmill.org/skyfield/' },
      MAST,
    ],
  },
  {
    id: 'data-analysis',
    name: 'Data analysis & statistics',
    group: 'Tools & data skills',
    level: 'Intermediate',
    aliases: ['error bars', 'chi squared', 'least squares', 'bayesian', 'mcmc', 'uncertainty', 'fitting', 'signal to noise'],
    blurb:
      'Error propagation, model fitting, and knowing when a result is real. The IOAA data-analysis paper is entirely this, and so is most research.',
    plan: [
      'Master error propagation and least-squares fitting by hand first.',
      'Learn chi-squared and what a fit statistic does and does not tell you.',
      'Move to Bayesian inference and MCMC once the frequentist tools feel natural.',
    ],
    courses: [
      { id: 'khan-stats', where: 'Units on distributions, sampling and inference' },
      { id: 'openstax-stats', where: 'Ch. 1–3 (descriptive stats) and the hypothesis-testing chapters' },
      { id: 'mit-18-085', where: 'The least-squares and data-fitting lectures' },
    ],
    prereqs: { math: ['probability-statistics'], physics: [] },
    links: [ASTROPY, ASTROBITES, SDSS],
  },
  {
    id: 'numerical-simulation',
    name: 'Numerical simulation',
    group: 'Tools & data skills',
    level: 'Advanced',
    aliases: ['n-body', 'integrator', 'leapfrog', 'runge kutta', 'smoothed particle hydrodynamics', 'sph', 'computational astrophysics'],
    blurb:
      'When the equations have no closed-form solution — which is most of the time — you integrate them. Symplectic integrators are why orbits stay stable.',
    plan: [
      'Write a two-body integrator yourself and watch a naive Euler method lose energy.',
      'Learn leapfrog and why symplectic integrators conserve energy over long runs.',
      'Move to an established N-body or hydrodynamics code for real problems.',
    ],
    courses: [
      { id: 'mit-18-085', where: 'The lectures on ODE integration and finite differences' },
      { id: 'mit-18-03', where: 'The numerical methods and stability lectures' },
      { id: 'mit-6-0001', where: 'Lectures 1–6 — enough Python to write an integrator' },
    ],
    prereqs: { math: ['numerical-methods'], physics: ['computational-physics'] },
    links: [
      { t: 'REBOUND — N-body integrator', s: 'Rein & Liu', u: 'https://rebound.readthedocs.io/' },
      { t: 'Einstein Toolkit — numerical relativity', s: 'Einstein Toolkit', u: 'https://einsteintoolkit.org/' },
      ARXIV,
    ],
    sims: ['darkMatter'],
  },
  {
    id: 'multiwavelength',
    name: 'Radio, X-ray & multiwavelength astronomy',
    group: 'Tools & data skills',
    level: 'Advanced',
    aliases: ['radio astronomy', 'interferometry', 'vlbi', 'x-ray', 'chandra', 'infrared', 'gamma ray', 'alma', 'jwst'],
    blurb:
      'Every waveband shows a different physical process. Radio interferometry in particular is how a telescope the size of Earth becomes possible.',
    plan: [
      'Learn what emission mechanism dominates in each band and what it reveals.',
      'Understand aperture synthesis — why the EHT works at all.',
      'Compare the same object across bands using real archive imagery.',
    ],
    courses: [
      { id: 'mit-8-902', where: 'Lectures on radiative processes and high-energy astrophysics' },
      { id: 'mit-8-02', where: 'The radiation lectures — how emission actually works' },
    ],
    prereqs: { math: ['fourier-analysis'], physics: ['electrodynamics'] },
    links: [
      { t: 'NRAO — radio astronomy', s: 'NRAO', u: 'https://public.nrao.edu/' },
      { t: 'Chandra X-ray Observatory', s: 'Harvard/CfA', u: 'https://chandra.harvard.edu/' },
      { t: 'Aladin Sky Atlas — overlay any survey', s: 'CDS Strasbourg', u: 'https://aladin.cds.unistra.fr/AladinLite/' },
      MAST,
    ],
  },
  {
    id: 'reading-papers',
    name: 'Reading research papers',
    group: 'Tools & data skills',
    level: 'Intermediate',
    aliases: ['arxiv', 'literature', 'ads', 'preprint', 'citation', 'journal club', 'research'],
    blurb:
      'The skill that separates people who follow astronomy from people who do it. Nobody reads a paper linearly — learn the order that works.',
    plan: [
      'Read abstract → figures → conclusions first; only then decide if the methods matter to you.',
      'Use Astrobites to get a guided summary before attempting the paper itself.',
      'Follow citations backwards through ADS to find the paper an idea actually came from.',
    ],
    courses: [
      { id: 'astropy-learn', where: 'Work a tutorial alongside a paper that used the same data' },
    ],
    prereqs: { math: [], physics: [] },
    links: [ASTROBITES, ARXIV, ADS],
  },

  // ------------------------------------------------------------ competitions
  {
    id: 'usaaao',
    name: 'USAAAO',
    group: 'Competitions',
    kind: 'competition',
    level: 'Advanced',
    aliases: [
      'usa astronomy and astrophysics olympiad', 'us astronomy olympiad', 'usaao',
      'astronomy olympiad usa', 'national astronomy competition', 'olympiad',
    ],
    blurb:
      'The United States Astronomy and Astrophysics Olympiad — the national selection route to the IOAA. First round is an open written exam; top scorers advance to the national exam and then team selection.',
    plan: [
      'Read the official syllabus first so you know the actual scope, then take a past exam cold to find your gaps.',
      'Work through the USAAAO Guide handouts — they are written by past USAAAO and IOAA participants and target exactly this exam.',
      'Drill past USAAAO and IOAA papers under time. Coordinates, photometry and orbital mechanics come up relentlessly.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 2–6 and 15–29 track the syllabus closely; Ch. 3, 17 and 19 are highest-yield' },
      { id: 'mit-8-282', where: 'Use as the problem-solving companion to the textbook chapters' },
      { id: 'yale-astr160', where: 'Good for the conceptual half — black holes, exoplanets, cosmology' },
    ],
    prereqs: { math: ['precalculus'], physics: ['mechanics-algebra'] },
    links: [
      { t: 'USAAAO Guide — handouts by past USAAAO/IOAA alumni', s: 'usaaao.guide', u: 'https://www.usaaao.guide/' },
      { t: 'Official site, syllabus & registration', s: 'USAAAO', u: 'https://usaaao.org/' },
      { t: 'Past exams', s: 'USAAAO', u: 'https://usaaao.org/resources/past-exams/' },
      { t: 'USAAAO prep guide — books, handouts, format', s: 'Omega Learn', u: 'https://www.omegalearn.org/usaaao' },
    ],
  },
  {
    id: 'ioaa',
    name: 'IOAA',
    group: 'Competitions',
    kind: 'competition',
    level: 'Advanced',
    aliases: [
      'international olympiad on astronomy and astrophysics', 'international astronomy olympiad',
      'world olympiad', 'ioaa exam',
    ],
    blurb:
      'The international olympiad, hosted in a different country each year. Three papers — theory, data analysis, and observation — with 40+ national teams competing.',
    plan: [
      'Qualify through your national olympiad first (USAAAO in the US, BAAO in the UK).',
      'Past IOAA papers are the single best preparation resource in existence for this level — work every one.',
      'Do not neglect the data-analysis and observational papers; they are where prepared candidates gain the most ground.',
    ],
    courses: [
      { id: 'mit-8-901', where: 'Graduate-level, but the stellar-structure lectures match IOAA theory' },
      { id: 'openstax-astro', where: 'Ch. 17–19 and 25–29 for the observational and cosmology rounds' },
      { id: 'yale-astr160', where: 'Background for the conceptual questions' },
    ],
    prereqs: { math: ['calculus-1'], physics: ['mechanics-calculus'] },
    links: [
      { t: 'Official site & past papers', s: 'IOAA', u: 'https://ioaastrophysics.org/' },
      { t: 'USAAAO Guide — IOAA-level handouts', s: 'usaaao.guide', u: 'https://www.usaaao.guide/' },
      { t: 'Data analysis with Astropy', s: 'Astropy Project', u: 'https://learn.astropy.org/' },
    ],
  },
  {
    id: 'iaac',
    name: 'IAAC',
    group: 'Competitions',
    kind: 'competition',
    level: 'Intermediate',
    aliases: [
      'international astronomy and astrophysics competition', 'online astronomy competition',
      'iaac space', 'heidelberg',
    ],
    blurb:
      'A fully online international competition open to students in any country, with no national qualification required. Deliberately more accessible than IOAA — a good first competition.',
    plan: [
      'Enter the qualification round — it is open to anyone and can be done from home.',
      'Problems reward clear physical reasoning over obscure knowledge; practise writing full solutions.',
      'Use it as a low-stakes ramp toward USAAAO or IOAA rather than an endpoint.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 1–6 for the qualification round; Ch. 15–24 for the final' },
      { id: 'khan-physics', where: 'Mechanics and gravitation units' },
    ],
    prereqs: { math: ['algebra-2'], physics: ['conceptual-physics'] },
    links: [
      { t: 'Official site & registration', s: 'IAAC', u: 'https://iaac.space/' },
      { t: 'About the competition & format', s: 'IAAC', u: 'https://iaac.space/en/about' },
    ],
  },
  {
    id: 'baao',
    name: 'BAAO / BPhO Astro Challenge',
    group: 'Competitions',
    kind: 'competition',
    level: 'Advanced',
    aliases: [
      'british astronomy and astrophysics olympiad', 'bpho', 'astro challenge',
      'british physics olympiad', 'uk astronomy olympiad',
    ],
    blurb:
      "The UK route to the IOAA. The one-hour Astro Challenge sits below it as an entry point, mixing observational astronomy with applied physics.",
    plan: [
      'Start with the Astro Challenge paper in the autumn term — it is short and a fair difficulty gauge.',
      'Sit BPhO Round 1 or BAAO Round 1, then Round 2 if invited.',
      'Past papers with full solutions are published; they are the core of any sensible preparation.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 2–6 (observational) and Ch. 17–19 (photometry) map to the Astro Challenge' },
      { id: 'mit-8-282', where: 'For the applied-physics half of the paper' },
      { id: 'yale-phys200', where: 'Mechanics lectures — the physics the paper assumes' },
    ],
    prereqs: { math: ['precalculus'], physics: ['mechanics-algebra'] },
    links: [
      { t: 'BAAO — papers, solutions & structure', s: 'British Physics Olympiad', u: 'https://www.bpho.org.uk/baao/' },
      { t: 'Astro Challenge', s: 'British Physics Olympiad', u: 'https://www.bpho.org.uk/baao/astro-challenge/' },
      { t: 'IOAA — where BAAO leads', s: 'IOAA', u: 'https://ioaastrophysics.org/' },
    ],
  },
  {
    id: 'science-olympiad-astronomy',
    name: 'Science Olympiad — Astronomy',
    group: 'Competitions',
    kind: 'competition',
    level: 'Intermediate',
    aliases: ['soinc', 'science olympiad', 'reach for the stars', 'astronomy event', 'division c'],
    blurb:
      'A US team event with a rotating annual topic (stellar evolution, variable stars, galaxies). Notes and calculators are permitted, so preparation is about building a good binder.',
    plan: [
      'Read the current rules to find this year’s specific topic and deep-sky object list.',
      'Build a well-indexed binder — the exam is timed and lookup speed is the real constraint.',
      'Practise image identification and light-curve interpretation, which carry heavy weight.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 18–24 (stars and their deaths) and Ch. 26–28 — check this year’s topic' },
    ],
    prereqs: { math: ['algebra-1'], physics: ['conceptual-physics'] },
    links: [
      { t: 'Official rules & event info', s: 'Science Olympiad', u: 'https://www.soinc.org/' },
      { t: 'JWST & Hubble imagery for DSO study', s: 'ESA/Webb', u: 'https://esawebb.org/images/' },
      { t: 'AAVSO — variable star light curves', s: 'AAVSO', u: 'https://www.aavso.org/' },
    ],
  },
  {
    id: 'physics-olympiad',
    name: 'Physics Olympiad (USAPhO / IPhO)',
    group: 'Competitions',
    kind: 'competition',
    level: 'Advanced',
    aliases: ['usapho', 'ipho', 'f=ma', 'physics team', 'aapt', 'physics bowl'],
    blurb:
      'Not astronomy, but the mechanics and E&M it drills are exactly what astrophysics olympiads assume you already have. Many USAAAO competitors come through here.',
    plan: [
      'Start with the F=ma exam — mechanics only, and the entry point to the US Physics Team.',
      'Move to USAPhO semifinals: full-length problems on mechanics, E&M, thermodynamics and modern physics.',
      'Past IPhO problems are the best available practice above that level.',
    ],
    courses: [
      { id: 'mit-8-01', where: 'The whole course — F=ma is entirely this material' },
      { id: 'mit-8-02', where: 'For the USAPhO semifinal E&M problems' },
      { id: 'yale-phys200', where: 'Lectures 1–12 for mechanics, then thermodynamics' },
      { id: 'feynman', where: 'Volume I for mechanics; Volume II for E&M' },
    ],
    prereqs: { math: ['calculus-1'], physics: ['mechanics-calculus'] },
    links: [
      { t: 'US Physics Team — exams & resources', s: 'AAPT', u: 'https://www.aapt.org/physicsteam/' },
      FEYNMAN,
      HYPERPHYSICS,
    ],
  },
  {
    id: 'research-fairs',
    name: 'Research fairs & projects',
    group: 'Competitions',
    kind: 'competition',
    level: 'Advanced',
    aliases: ['isef', 'regeneron', 'science fair', 'research project', 'independent research', 'space apps', 'hackathon'],
    blurb:
      'Original research rather than exams. Astronomy is unusually friendly here because so much professional-grade data is public and free.',
    plan: [
      'Pick a question answerable with public archive data — MAST, SDSS and the Exoplanet Archive are all open.',
      'Learn enough Python and statistics to do the analysis defensibly.',
      'Write it up properly, citing through ADS, and enter it somewhere.',
    ],
    courses: [
      { id: 'khan-stats', where: 'Units on inference — enough to defend your error bars' },
      { id: 'mit-6-0001', where: 'Lectures 1–6 for the analysis code' },
      { id: 'astropy-learn', where: 'The tutorials matching your data source' },
    ],
    prereqs: { math: ['probability-statistics'], physics: [] },
    links: [
      { t: 'Regeneron ISEF', s: 'Society for Science', u: 'https://www.societyforscience.org/isef/' },
      { t: 'NASA Space Apps Challenge', s: 'NASA', u: 'https://www.spaceappschallenge.org/' },
      MAST,
      ADS,
    ],
  },
  {
    id: 'citizen-science',
    name: 'Citizen science & observing programs',
    group: 'Competitions',
    kind: 'competition',
    level: 'Beginner',
    aliases: ['zooniverse', 'galaxy zoo', 'astronomy league', 'observing program', 'variable star observing', 'contribute'],
    blurb:
      'Contribute real observations or classifications to published research, with no competition and no entry requirements. The fastest route from interest to genuine participation.',
    plan: [
      'Start classifying on Zooniverse — Galaxy Zoo takes minutes and feeds real papers.',
      'If you own a telescope, submit variable-star observations to the AAVSO.',
      'Work through an Astronomy League observing program for structure and recognition.',
    ],
    courses: [
      { id: 'openstax-astro', where: 'Ch. 26 for galaxy morphology before classifying on Galaxy Zoo' },
    ],
    prereqs: { math: [], physics: [] },
    links: [
      { t: 'Zooniverse — real research projects', s: 'Zooniverse', u: 'https://www.zooniverse.org/' },
      { t: 'Observing programs', s: 'Astronomy League', u: 'https://www.astroleague.org/' },
      { t: 'AAVSO — submit observations', s: 'AAVSO', u: 'https://www.aavso.org/' },
    ],
  },
]

// Flat search index: name + aliases + group, lowercased once at module load.
export const TOPIC_INDEX = TOPICS.map((t) => ({
  topic: t,
  haystack: [t.name, t.group, ...(t.aliases ?? [])].join(' ').toLowerCase(),
}))

export function searchTopics(query, limit = 12) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  const scored = []
  for (const { topic, haystack } of TOPIC_INDEX) {
    if (!terms.every((term) => haystack.includes(term))) continue
    const name = topic.name.toLowerCase()
    // Rank exact and prefix matches on the name above deep alias hits.
    let score = 0
    if (name === q) score = 100
    else if (name.startsWith(q)) score = 80
    else if (name.includes(q)) score = 60
    else if ((topic.aliases ?? []).some((a) => a.toLowerCase().startsWith(q))) score = 40
    else score = 20
    if (topic.kind === 'competition') score += 5
    scored.push({ topic, score })
  }
  scored.sort((a, b) => b.score - a.score || a.topic.name.localeCompare(b.topic.name))
  return scored.slice(0, limit).map((s) => s.topic)
}

// Shown before the visitor has typed anything.
export const SUGGESTED_TOPIC_IDS = [
  'usaaao',
  'orbital-mechanics',
  'special-relativity',
  'black-holes',
  'constellations',
  'dark-matter',
  'exoplanets',
  'python-astronomy',
]
