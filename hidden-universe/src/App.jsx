import { useState } from 'react'
import Galaxy from './simulations/DarkMatter/Galaxy'
import BlackHole from './simulations/BlackHole/BlackHole'
import StarLifeCycle from './simulations/StarLifeCycle/StarLifeCycle'

export default function App() {
  const [sim, setSim] = useState('darkMatter')

  if (sim === 'blackHole')     return <BlackHole     onSwitchSim={setSim} />
  if (sim === 'starLifeCycle') return <StarLifeCycle onSwitchSim={setSim} />
  return <Galaxy onSwitchSim={setSim} />
}
