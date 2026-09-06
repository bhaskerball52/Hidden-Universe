import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SIM_ROUTES } from './site/siteData'
import { shouldRunIntro } from './site/useIntro'
// '/react', not '/next', the Next.js entrypoint pulls in next/navigation,
// which isn't installed in this Vite app and takes the whole bundle down.
import { Analytics } from '@vercel/analytics/react'
import { ClerkProvider } from '@clerk/react'

// Set before the first paint so the hub never renders with the simulations'
// scroll lock applied (and vice versa). Matched against the real slug list so a
// plain section anchor like #simulations isn't mistaken for a simulation route.
const slug = window.location.hash.replace(/^#\/?/, '').split('?')[0]
const isSim = SIM_ROUTES.includes(slug)
document.body.dataset.mode = isSim ? 'sim' : 'home'

// Lock scrolling for the opening sequence here rather than in an effect, so the
// page never paints a scrollbar for one frame before the lock lands.
if (!isSim && shouldRunIntro()) document.body.dataset.intro = 'running'

// Clerk's own modals are light by default, which would flash white over a very
// dark site. Theming by variables rather than pulling in @clerk/themes keeps it
// on this palette exactly and adds no dependency.
const CLERK_APPEARANCE = {
  variables: {
    colorBackground: '#0d0b18',
    colorInputBackground: '#141122',
    colorPrimary: '#ff4d6d',
    colorText: '#ece9f6',
    colorTextSecondary: '#a7a2bd',
    colorInputText: '#f3f1fa',
    colorNeutral: '#ffffff',
    borderRadius: '11px',
  },
  elements: {
    card: { border: '1px solid rgba(255,255,255,0.16)' },
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* publishableKey must be passed explicitly: without it the Clerk modals
        render blank instead of erroring, which is a slow thing to debug. */}
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={CLERK_APPEARANCE}
    >
      <App />
    </ClerkProvider>
    {/* Analytics sits outside the provider: it needs no auth context. */}
    <Analytics />
  </StrictMode>,
)
