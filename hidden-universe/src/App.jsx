import { useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import Galaxy from './simulations/DarkMatter/Galaxy'
import BlackHole from './simulations/BlackHole/BlackHole'
import NeutronStar from './simulations/NeutronStar/NeutronStar'
import Wormhole from './simulations/Wormhole/Wormhole'

export default function App() {
  const [sim, setSim] = useState('darkMatter')

  return (
    <>
      {sim === 'blackHole'   && <BlackHole   onSwitchSim={setSim} />}
      {sim === 'neutronStar' && <NeutronStar onSwitchSim={setSim} />}
      {sim === 'wormhole'    && <Wormhole    onSwitchSim={setSim} />}
      {sim === 'darkMatter'  && <Galaxy      onSwitchSim={setSim} />}
      <Analytics />
    </>
  )
}
