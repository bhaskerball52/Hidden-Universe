// Inline SVG icon set. Everything is stroke/fill "currentColor" so icons pick
// up whatever accent the surrounding card sets.

const P = { width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false }

export function InstagramIcon() {
  return (
    <svg {...P} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTokIcon() {
  return (
    <svg {...P} fill="currentColor">
      <path d="M16.5 3h-2.7v12.1a2.6 2.6 0 1 1-2.1-2.55v-2.75a5.35 5.35 0 1 0 4.8 5.3V9.2a6.5 6.5 0 0 0 3.7 1.16V7.6A3.9 3.9 0 0 1 16.5 3z" />
    </svg>
  )
}

export function YouTubeIcon() {
  return (
    <svg {...P} fill="currentColor">
      <path d="M22.2 7.6a2.7 2.7 0 0 0-1.9-1.9C18.6 5.2 12 5.2 12 5.2s-6.6 0-8.3.5A2.7 2.7 0 0 0 1.8 7.6 28 28 0 0 0 1.3 12c0 1.5.15 3 .5 4.4a2.7 2.7 0 0 0 1.9 1.9c1.7.5 8.3.5 8.3.5s6.6 0 8.3-.5a2.7 2.7 0 0 0 1.9-1.9c.35-1.4.5-2.9.5-4.4s-.15-3-.5-4.4zM9.9 15.1V8.9l5.4 3.1-5.4 3.1z" />
    </svg>
  )
}

export function XIcon() {
  return (
    <svg {...P} fill="currentColor">
      <path d="M17.53 3h3.2l-7 8 8.23 10h-6.44l-5.05-6.15L4.7 21H1.5l7.5-8.57L1.1 3h6.6l4.56 5.62L17.53 3zm-1.12 16.1h1.77L7.7 4.8H5.8l10.61 14.3z" />
    </svg>
  )
}

export function GitHubIcon() {
  return (
    <svg {...P} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  )
}

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  x: XIcon,
  github: GitHubIcon,
}

export function SocialIcon({ name }) {
  const Cmp = SOCIAL_ICONS[name]
  return Cmp ? <Cmp /> : null
}

export function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  )
}

export function ExternalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <radialGradient id="hu-logo-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor="#ff8fab" />
          <stop offset="100%" stopColor="#ff4d6d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="9" fill="url(#hu-logo-core)" />
      <circle cx="24" cy="24" r="5.5" fill="#06040c" />
      <ellipse
        cx="24"
        cy="24"
        rx="21"
        ry="7.5"
        fill="none"
        stroke="#5fd0ff"
        strokeWidth="1.6"
        opacity="0.85"
        transform="rotate(-22 24 24)"
      />
      <ellipse
        cx="24"
        cy="24"
        rx="21"
        ry="7.5"
        fill="none"
        stroke="#c084fc"
        strokeWidth="1.2"
        opacity="0.5"
        transform="rotate(28 24 24)"
      />
    </svg>
  )
}
