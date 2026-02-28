import { registerPlugin } from '@capacitor/core'

const Aria2Engine = registerPlugin('Aria2Engine', {
  web: () => import('./web').then(m => new m.Aria2EngineWeb())
})

export default Aria2Engine
