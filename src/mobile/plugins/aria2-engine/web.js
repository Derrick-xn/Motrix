import { WebPlugin } from '@capacitor/core'

export class Aria2EngineWeb extends WebPlugin {
  async startEngine (options) {
    console.log('[Aria2Engine Web] startEngine', options)
    return {
      started: false,
      running: false,
      dir: options && options.dir,
      message: 'aria2 engine not available in web mode. Connect to remote aria2 instead.'
    }
  }

  async stopEngine () {
    console.log('[Aria2Engine Web] stopEngine')
    return { stopped: true }
  }

  async getEngineStatus () {
    return { running: false, pid: -1, dir: '' }
  }

  async isEngineRunning () {
    return { running: false }
  }
}
