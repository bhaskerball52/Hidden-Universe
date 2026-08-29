import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SIM_ROUTES } from './site/siteData'
import { shouldRunIntro } from './site/useIntro'
// '/react', not '/next' — the Next.js entrypoint pulls in next/navigation,
// which isn't installed in this Vite app and takes the whole bundle down.
import { Analytics } from '@vercel/analytics/react'

// Set before the first paint so the hub never renders with the simulations'
// scroll lock applied (and vice versa). Matched against the real slug list so a
// plain section anchor like #simulations isn't mistaken for a simulation route.
const slug = window.location.hash.replace(/^#\/?/, '').split('?')[0]
const isSim = SIM_ROUTES.includes(slug)
document.body.dataset.mode = isSim ? 'sim' : 'home'

// Lock scrolling for the opening sequence here rather than in an effect, so the
// page never paints a scrollbar for one frame before the lock lands.
if (!isSim && shouldRunIntro()) document.body.dataset.intro = 'running'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
