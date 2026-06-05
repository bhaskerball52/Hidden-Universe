import { useState } from 'react'
import Galaxy from './simulations/DarkMatter/Galaxy'
import BlackHole from './simulations/BlackHole/BlackHole'
import NeutronStar from './simulations/NeutronStar/NeutronStar'
import Wormhole from './simulations/Wormhole/Wormhole'

export default function App() {
  const [sim, setSim] = useState('darkMatter')

  if (sim === 'blackHole')   return <BlackHole   onSwitchSim={setSim} />
  if (sim === 'neutronStar') return <NeutronStar onSwitchSim={setSim} />
  if (sim === 'wormhole')    return <Wormhole    onSwitchSim={setSim} />
  return <Galaxy onSwitchSim={setSim} />
}
