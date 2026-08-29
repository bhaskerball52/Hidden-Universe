// ---------------------------------------------------------------------------
// Site content for the Hidden Universe hub. Everything the homepage renders is
// declared here so copy, links and socials can be edited without touching JSX.
// ---------------------------------------------------------------------------

export const SITE = {
  name: 'Hidden Universe',
  tagline: 'Real physics you can grab, spin, and break.',
  blurb:
    'Interactive astrophysics simulations built on the actual equations — Kerr geodesics, ' +
    'NFW halos, magnetic dipole spin-down — paired with a curated route into learning the ' +
    'universe for yourself.',
  repo: 'https://github.com/bhaskerball52/Hidden-Universe',
}

// Social profiles. The section renders whatever is in this list, in order.
export const SOCIALS = [
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@hidden._.universe52',
    url: 'https://www.youtube.com/@hidden._.universe52',
    accent: '#ff4d4d',
    icon: 'youtube',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@hidden.universe__',
    url: 'https://www.instagram.com/hidden.universe__/',
    accent: '#e1568b',
    icon: 'instagram',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@hidden.universe',
    url: 'https://www.tiktok.com/@hidden.universe',
    accent: '#3ee0d8',
    icon: 'tiktok',
  },
  {
    id: 'github',
    name: 'GitHub',
    handle: 'bhaskerball52/Hidden-Universe',
    url: 'https://github.com/bhaskerball52/Hidden-Universe',
    accent: '#a78bfa',
    icon: 'github',
  },
]

// ---------------------------------------------------------------------------
// Simulations. `route` is the hash slug; `key` is what App passes to setSim.
// ---------------------------------------------------------------------------
// Slugs used by the hash router. Kept as a plain list so main.jsx can pick the
// layout mode before React mounts without importing the whole data module.
export const SIM_ROUTES = ['dark-matter', 'black-hole', 'neutron-star', 'wormhole']

export const SIMULATIONS = [
  {
    key: 'darkMatter',
    route: 'dark-matter',
    name: 'Dark Matter Halo',
    kicker: 'Galactic dynamics',
    accent: '#ff4d6d',
    accentSoft: '#ff8fab',
    art: 'galaxy',
    summary:
      'Spin up a galaxy and watch its rotation curve refuse to fall off. Swap between NFW and ' +
      'pseudo-isothermal halo profiles, dial the halo mass, and see the gap between what baryons ' +
      'predict and what we actually observe.',
    concepts: ['NFW profile', 'Rotation curves', 'Core–cusp problem', 'Gravitational lensing'],
    features: [
      'Live rotation-curve plot vs. the baryons-only model',
      'Webcam hand-gesture control with angular-momentum coasting',
      'Adjustable scale radius, density factor, velocity scaling',
    ],
    level: 'Intermediate',
  },
  {
    key: 'blackHole',
    route: 'black-hole',
    name: 'Kerr Black Hole',
    kicker: 'General relativity',
    accent: '#ff7a3c',
    accentSoft: '#ffb37a',
    art: 'blackhole',
    summary:
      'A spinning black hole rendered from ray-traced null geodesics — the accretion disk bends ' +
      'over the top of the shadow because the light really is following curved spacetime, not a ' +
      'texture trick.',
    concepts: ['Schwarzschild metric', 'Photon sphere', 'ISCO', 'Frame dragging', 'Doppler beaming'],
    features: [
      'Spin parameter a/M from Schwarzschild through to near-extremal',
      'Gravitational redshift and relativistic beaming across the disk',
      'Event horizon, photon ring and ISCO drawn to scale',
    ],
    level: 'Advanced',
  },
  {
    key: 'neutronStar',
    route: 'neutron-star',
    name: 'Neutron Star',
    kicker: 'Compact objects',
    accent: '#5aa9ff',
    accentSoft: '#aee0ff',
    art: 'pulsar',
    summary:
      'A magnetar the size of a city with the mass of the Sun. Tilt the magnetic axis away from ' +
      'the spin axis and the beams sweep past you as a pulse — the lighthouse model, running live.',
    concepts: ['Degeneracy pressure', 'TOV limit', 'Magnetic dipole', 'Light cylinder', 'Spin-down'],
    features: [
      'Dipole field lines that open out beyond the light cylinder',
      'Spin-down luminosity from the magnetic dipole braking law',
      'Surface gravity and gravitational redshift readouts',
    ],
    level: 'Intermediate',
  },
  {
    key: 'wormhole',
    route: 'wormhole',
    name: 'Wormhole',
    kicker: 'Exotic spacetime',
    accent: '#5fd0ff',
    accentSoft: '#b3f0ff',
    art: 'wormhole',
    summary:
      'Fly through an Ellis / Morris–Thorne throat and watch two sky regions blend at the mouth. ' +
      'The lensing comes from integrating null geodesics through the metric — including the part ' +
      'where you need matter that almost certainly does not exist.',
    concepts: ['Ellis metric', 'Throat radius', 'Null geodesics', 'Exotic matter', 'NEC violation'],
    features: [
      'Adjustable throat radius and embedding-diagram view',
      'Photon ring at the throat with the far-side sky mapped through it',
      'Honest treatment of the null energy condition problem',
    ],
    level: 'Advanced',
  },
]

// ---------------------------------------------------------------------------
// A suggested route through the material, so a newcomer has an order to follow.
// ---------------------------------------------------------------------------
export const PATH = [
  {
    step: '01',
    title: 'Learn the basics',
    blurb:
      'Learn the sky, the distance ladder, and the vocabulary. Nothing below makes sense until ' +
      'parsecs, magnitudes and redshift feel ordinary.',
    picks: ['OpenStax Astronomy 2e', 'Crash Course Astronomy', 'Stellarium Web'],
    accent: '#ff4d6d',
  },
  {
    step: '02',
    title: 'Delve into the physics',
    blurb:
      'Newtonian gravity, orbital mechanics, then special and general relativity. This is where ' +
      'the black hole and wormhole simulations stop being pretty and start being readable.',
    picks: ["Susskind's Theoretical Minimum", 'David Tong — GR notes', 'Carroll — GR lecture notes'],
    accent: '#ff7a3c',
  },
  {
    step: '03',
    title: 'Experiment with data',
    blurb:
      'Query the same archives professional astronomers use, plot something nobody asked you to ' +
      'plot, and read the paper it came from. This is the step most people skip.',
    picks: ['NASA ADS', 'MAST archive', 'Astropy', 'Zooniverse'],
    accent: '#5aa9ff',
  },
]

export const RESOURCE_CATEGORIES = [
  { id: 'all', label: 'Everything' },
  { id: 'course', label: 'Courses' },
  { id: 'reading', label: 'Reading' },
  { id: 'video', label: 'Video' },
  { id: 'tool', label: 'Tools & data' },
  { id: 'research', label: 'Research' },
]

// `free: true` means no paywall, no account required.
export const RESOURCES = [
  // --- Courses -------------------------------------------------------------
  {
    category: 'course',
    title: 'MIT 8.286 — The Early Universe',
    source: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/8-286-the-early-universe-fall-2013/',
    blurb: 'Alan Guth teaching inflationary cosmology, with full lecture video and problem sets.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'course',
    title: 'ASTR 160 — Frontiers and Controversies in Astrophysics',
    source: 'Open Yale Courses',
    url: 'https://oyc.yale.edu/astronomy/astr-160',
    blurb:
      'Charles Bailyn on exoplanets, black holes and dark energy. The clearest first real ' +
      'astrophysics course on the internet.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'course',
    title: 'The Theoretical Minimum',
    source: 'Leonard Susskind, Stanford',
    url: 'https://theoreticalminimum.com/courses',
    blurb:
      'Classical mechanics → SR → GR → cosmology, taught as the smallest set of things you ' +
      'actually need to know to do the physics.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'course',
    title: 'The Biggest Ideas in the Universe',
    source: 'Sean Carroll',
    url: 'https://www.preposterousuniverse.com/biggestideas/',
    blurb:
      'Equation-first explanations for non-specialists — the honest middle ground between pop ' +
      'science and a textbook.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'course',
    title: 'PhET Interactive Simulations',
    source: 'University of Colorado Boulder',
    url: 'https://phet.colorado.edu/en/simulations/filter?subjects=physics',
    blurb: 'Gravity, orbits, waves and quantum sims to build intuition before the algebra.',
    level: 'Beginner',
    free: true,
  },

  // --- Reading -------------------------------------------------------------
  {
    category: 'reading',
    title: 'Astronomy 2e',
    source: 'OpenStax',
    url: 'https://openstax.org/details/books/astronomy-2e',
    blurb: 'A complete, genuinely free intro-astronomy textbook. Start here if you start anywhere.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'reading',
    title: 'Lecture Notes on General Relativity',
    source: 'Sean Carroll (arXiv)',
    url: 'https://arxiv.org/abs/gr-qc/9712019',
    blurb:
      'The notes that became the standard GR textbook. Everything the black-hole simulation ' +
      'computes is derived in here.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'reading',
    title: 'David Tong — Lectures on Theoretical Physics',
    source: 'University of Cambridge',
    url: 'https://www.damtp.cam.ac.uk/user/tong/teaching.html',
    blurb:
      'Cosmology, general relativity, dynamics and more. Beautifully written and free as PDFs.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'reading',
    title: 'Astrobites',
    source: 'Graduate astronomers',
    url: 'https://astrobites.org/',
    blurb:
      'One new astro-ph paper summarised each weekday at undergraduate level. The best habit on ' +
      'this whole page.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'reading',
    title: 'Astronomy Picture of the Day',
    source: 'NASA',
    url: 'https://apod.nasa.gov/apod/astropix.html',
    blurb: 'Running since 1995, every image explained by a working astronomer. A 30-year archive.',
    level: 'Beginner',
    free: true,
  },

  // --- Video ---------------------------------------------------------------
  {
    category: 'video',
    title: 'PBS Space Time',
    source: 'YouTube',
    url: 'https://www.youtube.com/@pbsspacetime',
    blurb:
      'The rare channel that shows the actual metric. Good companion to the wormhole and Kerr ' +
      'simulations here.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'video',
    title: 'Dr. Becky',
    source: 'YouTube',
    url: 'https://www.youtube.com/@DrBecky',
    blurb: 'An Oxford astrophysicist on black holes, galaxies and what just landed on astro-ph.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'video',
    title: '3Blue1Brown',
    source: 'YouTube',
    url: 'https://www.youtube.com/@3blue1brown',
    blurb:
      'Not astronomy — but the linear algebra and calculus intuition that makes astrophysics ' +
      'readable rather than memorised.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'video',
    title: 'Deep Sky Videos',
    source: 'YouTube',
    url: 'https://www.youtube.com/@DeepSkyVideos',
    blurb: 'Working astronomers walking through every Messier object and the telescopes used.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'video',
    title: 'Crash Course Astronomy',
    source: 'YouTube',
    url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtPAJr1ysd5yGIyiSFuh0mIL',
    blurb: 'Phil Plait covering the whole field in 46 episodes. The fastest orientation available.',
    level: 'Beginner',
    free: true,
  },

  // --- Tools & data --------------------------------------------------------
  {
    category: 'tool',
    title: 'Astropy',
    source: 'Astropy Project',
    url: 'https://www.astropy.org/',
    blurb:
      'The Python library professional astronomers actually use — coordinates, units, cosmology, ' +
      'FITS files.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'tool',
    title: 'Stellarium Web',
    source: 'Stellarium',
    url: 'https://stellarium-web.org/',
    blurb: 'A full planetarium in the browser. Find out what is above you tonight, to the minute.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'tool',
    title: 'NASA Eyes on the Solar System',
    source: 'NASA/JPL',
    url: 'https://eyes.nasa.gov/apps/solar-system/',
    blurb: 'Real ephemerides, real spacecraft trajectories, rendered in real time.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'tool',
    title: 'Aladin Sky Atlas',
    source: 'CDS Strasbourg',
    url: 'https://aladin.cds.unistra.fr/AladinLite/',
    blurb: 'Overlay real survey imagery across every wavelength and query catalogues on top of it.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'tool',
    title: 'SDSS SkyServer',
    source: 'Sloan Digital Sky Survey',
    url: 'https://skyserver.sdss.org/',
    blurb:
      'Millions of galaxy spectra and images, queryable with SQL. Where amateur rotation-curve ' +
      'projects start.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'tool',
    title: 'MAST — Space Telescope Archive',
    source: 'STScI',
    url: 'https://archive.stsci.edu/',
    blurb: 'Raw and calibrated Hubble, JWST, TESS and Kepler data. Free, no affiliation needed.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'tool',
    title: 'NASA Exoplanet Archive',
    source: 'NASA/IPAC',
    url: 'https://exoplanetarchive.ipac.caltech.edu/',
    blurb: 'Every confirmed planet with its measured parameters and the paper each came from.',
    level: 'Intermediate',
    free: true,
  },
  {
    category: 'tool',
    title: 'JPL Horizons',
    source: 'NASA/JPL',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
    blurb: 'Solar-system ephemerides to absurd precision. Feed it straight into your own sim.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'tool',
    title: 'Zooniverse',
    source: 'Citizen science',
    url: 'https://www.zooniverse.org/',
    blurb:
      'Classify real galaxies and transits alongside research teams. Contributions end up in ' +
      'published papers.',
    level: 'Beginner',
    free: true,
  },

  // --- Research ------------------------------------------------------------
  {
    category: 'research',
    title: 'arXiv astro-ph',
    source: 'Cornell University',
    url: 'https://arxiv.org/list/astro-ph/recent',
    blurb: 'Every astrophysics preprint, the day it is written. This is where the field happens.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'research',
    title: 'NASA ADS',
    source: 'Harvard/Smithsonian',
    url: 'https://ui.adsabs.harvard.edu/',
    blurb:
      'The literature search engine of astronomy — citations, full text, and export back to 1850.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'research',
    title: 'Gravitational Wave Open Science Center',
    source: 'LIGO / Virgo / KAGRA',
    url: 'https://gwosc.org/',
    blurb:
      'The actual strain data from every detected merger, plus tutorials for re-deriving the ' +
      'masses yourself.',
    level: 'Advanced',
    free: true,
  },
  {
    category: 'research',
    title: 'ESA/Webb Image Releases',
    source: 'ESA',
    url: 'https://esawebb.org/images/',
    blurb: 'Full-resolution JWST releases with the science write-up attached to each one.',
    level: 'Beginner',
    free: true,
  },
  {
    category: 'research',
    title: 'Event Horizon Telescope',
    source: 'EHT Collaboration',
    url: 'https://eventhorizontelescope.org/',
    blurb:
      'The M87* and Sgr A* results — worth reading next to the Kerr simulation on this site.',
    level: 'Intermediate',
    free: true,
  },
]
