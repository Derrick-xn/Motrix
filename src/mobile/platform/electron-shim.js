const noop = () => {}

class IpcRendererShim {
  constructor () {
    this._listeners = {}
  }

  on (channel, listener) {
    if (!this._listeners[channel]) {
      this._listeners[channel] = []
    }
    this._listeners[channel].push(listener)
    return this
  }

  once (channel, listener) {
    const wrapper = (...args) => {
      listener(...args)
      this.removeListener(channel, wrapper)
    }
    return this.on(channel, wrapper)
  }

  removeListener (channel, listener) {
    if (this._listeners[channel]) {
      this._listeners[channel] = this._listeners[channel].filter(l => l !== listener)
    }
    return this
  }

  removeAllListeners (channel) {
    if (channel) {
      delete this._listeners[channel]
    } else {
      this._listeners = {}
    }
    return this
  }

  send (channel, ...args) {
    console.log(`[Mobile IPC] send: ${channel}`, ...args)
  }

  invoke (channel, ...args) {
    console.log(`[Mobile IPC] invoke: ${channel}`, ...args)
    if (channel === 'get-app-config') {
      return Promise.resolve(getStoredConfig())
    }
    return Promise.resolve(null)
  }

  emit (channel, ...args) {
    const listeners = this._listeners[channel]
    if (listeners) {
      listeners.forEach(l => l({}, ...args))
    }
  }
}

function getStoredConfig () {
  try {
    const stored = localStorage.getItem('motrix-config')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('[Mobile] Failed to load config from localStorage:', e)
  }
  return getDefaultConfig()
}

function getDefaultConfig () {
  return {
    'rpc-listen-port': 16800,
    'rpc-secret': '',
    locale: navigator.language || 'en-US',
    theme: 'auto',
    dir: '/storage/emulated/0/Download',
    'task-notification': true,
    'hide-app-menu': false,
    split: 16,
    'max-concurrent-downloads': 5,
    'max-connection-per-server': 16,
    continue: true,
    'user-agent': 'Motrix/1.8.19'
  }
}

export const ipcRenderer = new IpcRendererShim()

export const shell = {
  openPath: (path) => {
    console.log('[Mobile] openPath:', path)
    return Promise.resolve('')
  },
  showItemInFolder: (path) => {
    console.log('[Mobile] showItemInFolder:', path)
  },
  trashItem: (path) => {
    console.log('[Mobile] trashItem:', path)
    return Promise.resolve()
  },
  openExternal: (url) => {
    window.open(url, '_blank')
    return Promise.resolve()
  }
}

export const nativeTheme = {
  get shouldUseDarkColors () {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  },
  on: noop,
  removeListener: noop
}

export const dialog = {
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
  showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
  showSaveDialog: () => Promise.resolve({ canceled: true, filePath: '' })
}

export const app = {
  getVersion: () => '1.8.19',
  getName: () => 'Motrix',
  getPath: () => '',
  getLocale: () => navigator.language || 'en-US',
  quit: noop,
  relaunch: noop,
  isPackaged: true
}

export const webContents = {
  getAllWebContents: () => [],
  getFocusedWebContents: () => null
}

export const remote = {
  shell,
  nativeTheme,
  dialog,
  app
}

const electronIs = {
  renderer: () => false,
  macOS: () => false,
  windows: () => false,
  linux: () => false,
  all: () => true,
  mobile: () => true
}

export default electronIs
