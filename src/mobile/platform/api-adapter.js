import { isEmpty, clone } from 'lodash'
import { Aria2 } from '@shared/aria2'
import {
  separateConfig,
  compactUndefined,
  formatOptionsForEngine,
  mergeTaskResult,
  changeKeysToCamelCase,
  changeKeysToKebabCase
} from '@shared/utils'
import { ENGINE_RPC_HOST } from '@shared/constants'

const CONFIG_KEY = 'motrix-config'
const DEFAULT_BT_TRACKER_LIST = [
  'https://tracker.pmman.tech:443/announce',
  'https://tr.nyacat.pw:443/announce',
  'https://tracker.zhuqiy.com:443/announce',
  'https://tracker.moeking.me:443/announce',
  'https://tr.zukizuki.org:443/announce',
  'https://cny.fan:443/announce',
  'https://tracker.iochimari.moe:443/announce',
  'https://tracker.opentrackr.org:443/announce',
  'https://opentracker.i2p.rocks:443/announce',
  'https://torrent.tracker.durukanbal.com:443/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://opentracker.io:6969/announce',
  'udp://tracker.theoks.net:6969/announce',
  'udp://tracker.srv00.com:6969/announce',
  'udp://tracker.qu.ax:6969/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://tracker.alaskantf.com:6969/announce',
  'udp://tracker-udp.gbitt.info:80/announce',
  'udp://t.overflow.biz:6969/announce',
  'udp://open.dstud.io:6969/announce',
  'udp://leet-tracker.moe:1337/announce',
  'udp://explodie.org:6969/announce',
  'udp://bittorrent-tracker.e-n-c-r-y-p-t.net:1337/announce'
]
const DEFAULT_BT_TRACKERS = DEFAULT_BT_TRACKER_LIST.join(',')

const isMagnetLink = (uri = '') => {
  return /^magnet:/i.test(`${uri}`.trim())
}

const splitTrackers = (trackers) => {
  if (!trackers) return []
  if (Array.isArray(trackers)) {
    return trackers
      .map(item => `${item}`.trim())
      .filter(Boolean)
  }
  return `${trackers}`
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean)
}

const buildMagnetTrackerOption = (trackers) => {
  const merged = [...splitTrackers(trackers), ...DEFAULT_BT_TRACKER_LIST]
  if (merged.length === 0) {
    return DEFAULT_BT_TRACKERS
  }
  return Array.from(new Set(merged)).join(',')
}

function getDefaultConfig () {
  return {
    'rpc-listen-port': 16800,
    'rpc-secret': '',
    locale: navigator.language || 'en-US',
    theme: 'auto',
    dir: '/storage/emulated/0/Download',
    'task-notification': true,
    split: 16,
    'max-concurrent-downloads': 5,
    'max-connection-per-server': 16,
    continue: true,
    'user-agent': 'Motrix/1.8.19'
  }
}

export default class MobileApi {
  constructor (options = {}) {
    this.options = options
    this._reconnectTimer = null
    this._maxReconnectDelay = 10000
    this._reconnectDelay = 1000
    this.init()
  }

  async init () {
    this.config = await this.loadConfig()
    this.client = this.initClient()
    this._connectWithRetry()
  }

  _connectWithRetry () {
    this.client.open()
      .then(() => {
        console.info('[Mobile] WebSocket connected to aria2')
        this._reconnectDelay = 1000
        this.client.on('close', () => {
          console.warn('[Mobile] WebSocket closed, scheduling reconnect...')
          this._scheduleReconnect()
        })
      })
      .catch((err) => {
        console.warn('[Mobile] WebSocket connect failed:', err.message || err)
        this._scheduleReconnect()
      })
  }

  _scheduleReconnect () {
    if (this._reconnectTimer) return
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null
      this.client = this.initClient()
      this._connectWithRetry()
    }, this._reconnectDelay)
    this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, this._maxReconnectDelay)
  }

  async loadConfig () {
    let result = this.loadConfigFromLocalStorage()
    result = changeKeysToCamelCase(result)
    return result
  }

  loadConfigFromLocalStorage () {
    try {
      const stored = localStorage.getItem(CONFIG_KEY)
      if (stored) {
        return { ...getDefaultConfig(), ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn('[Mobile] Failed to load config:', e)
    }
    return getDefaultConfig()
  }

  saveConfigToLocalStorage (params = {}) {
    try {
      const existing = this.loadConfigFromLocalStorage()
      const merged = { ...existing, ...params }
      localStorage.setItem(CONFIG_KEY, JSON.stringify(merged))
    } catch (e) {
      console.warn('[Mobile] Failed to save config:', e)
    }
  }

  initClient () {
    const {
      rpcListenPort: port = 16800,
      rpcSecret: secret = ''
    } = this.config || {}
    const host = ENGINE_RPC_HOST
    return new Aria2({
      host,
      port,
      secret
    })
  }

  closeClient () {
    this.client.close()
      .then(() => {
        this.client = null
      })
      .catch(err => {
        console.log('engine client close fail', err)
      })
  }

  async fetchPreference () {
    this.config = await this.loadConfig()
    return this.config
  }

  savePreference (params = {}) {
    const kebabParams = changeKeysToKebabCase(params)
    this.saveConfigToLocalStorage(kebabParams)

    const { system } = separateConfig(kebabParams)
    if (!isEmpty(system)) {
      this.updateActiveTaskOption(system)
    }
  }

  getVersion () {
    return this.client.call('getVersion')
  }

  changeGlobalOption (options) {
    const args = formatOptionsForEngine(options)
    return this.client.call('changeGlobalOption', args)
  }

  getGlobalOption () {
    return new Promise((resolve) => {
      this.client.call('getGlobalOption')
        .then((data) => {
          resolve(changeKeysToCamelCase(data))
        })
    })
  }

  getOption (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])
    return new Promise((resolve) => {
      this.client.call('getOption', ...args)
        .then((data) => {
          resolve(changeKeysToCamelCase(data))
        })
    })
  }

  updateActiveTaskOption (options) {
    this.fetchTaskList({ type: 'active' })
      .then((data) => {
        if (isEmpty(data)) return
        const gids = data.map((task) => task.gid)
        this.batchChangeOption({ gids, options })
      })
  }

  changeOption (params = {}) {
    const { gid, options = {} } = params
    const engineOptions = formatOptionsForEngine(options)
    const args = compactUndefined([gid, engineOptions])
    return this.client.call('changeOption', ...args)
  }

  getGlobalStat () {
    return this.client.call('getGlobalStat')
  }

  addUri (params) {
    const { uris, outs, options } = params
    const tasks = uris.map((uri, index) => {
      const magnetLink = isMagnetLink(uri)
      const customTracker = options && (options.btTracker || options['bt-tracker'])
      const extraOptions = magnetLink
        ? { btTracker: buildMagnetTrackerOption(customTracker) }
        : {}
      const engineOptions = formatOptionsForEngine({
        ...options,
        ...extraOptions
      })
      if (outs && outs[index]) {
        engineOptions.out = outs[index]
      }
      return compactUndefined([[uri], engineOptions])
    })
    if (tasks.length === 1) {
      return this.client.call('addUri', ...tasks[0])
    }
    return Promise.all(tasks.map((args) => this.client.call('addUri', ...args)))
  }

  addTorrent (params) {
    const { torrent, options } = params
    const engineOptions = formatOptionsForEngine(options)
    const args = compactUndefined([torrent, [], engineOptions])
    return this.client.call('addTorrent', ...args)
  }

  addMetalink (params) {
    const { metalink, options } = params
    const engineOptions = formatOptionsForEngine(options)
    const args = compactUndefined([metalink, engineOptions])
    return this.client.call('addMetalink', ...args)
  }

  fetchDownloadingTaskList (params = {}) {
    const { offset = 0, num = 20, keys } = params
    const activeArgs = compactUndefined([keys])
    const waitingArgs = compactUndefined([offset, num, keys])
    return new Promise((resolve, reject) => {
      const multicall = this.client.multicall([
        ['aria2.tellActive', ...activeArgs],
        ['aria2.tellWaiting', ...waitingArgs]
      ])

      const timeout = new Promise((_, rejectTimeout) => {
        setTimeout(() => rejectTimeout(new Error('multicall-timeout')), 2000)
      })

      Promise.race([multicall, timeout])
        .then((data) => {
          const result = mergeTaskResult(data)
          resolve(result)
        })
        .catch(() => {
          Promise.all([
            this.client.call('tellActive', ...activeArgs),
            this.client.call('tellWaiting', ...waitingArgs)
          ])
            .then(([active = [], waiting = []]) => {
              resolve([].concat(active || [], waiting || []))
            })
            .catch((err) => {
              reject(err)
            })
        })
    })
  }

  fetchWaitingTaskList (params = {}) {
    const { offset = 0, num = 20, keys } = params
    const args = compactUndefined([offset, num, keys])
    return this.client.call('tellWaiting', ...args)
  }

  fetchStoppedTaskList (params = {}) {
    const { offset = 0, num = 20, keys } = params
    const args = compactUndefined([offset, num, keys])
    return this.client.call('tellStopped', ...args)
  }

  fetchActiveTaskList (params = {}) {
    const { keys } = params
    const args = compactUndefined([keys])
    return this.client.call('tellActive', ...args)
  }

  fetchTaskList (params = {}) {
    const { type } = params
    switch (type) {
    case 'active':
      return this.fetchDownloadingTaskList(params)
    case 'waiting':
      return this.fetchWaitingTaskList(params)
    case 'stopped':
      return this.fetchStoppedTaskList(params)
    default:
      return this.fetchDownloadingTaskList(params)
    }
  }

  fetchTaskItem (params = {}) {
    const { gid, keys } = params
    const args = compactUndefined([gid, keys])
    return this.client.call('tellStatus', ...args)
  }

  fetchTaskItemWithPeers (params = {}) {
    const { gid, keys } = params
    const statusArgs = compactUndefined([gid, keys])
    const peersArgs = compactUndefined([gid])
    return new Promise((resolve, reject) => {
      this.client.multicall([
        ['aria2.tellStatus', ...statusArgs],
        ['aria2.getPeers', ...peersArgs]
      ]).then((data) => {
        const statusRes = data && data[0]
        const peersRes = data && data[1]
        const statusArr = Array.isArray(statusRes)
          ? statusRes
          : (statusRes && Array.isArray(statusRes.result) ? statusRes.result : [])
        const peersArr = Array.isArray(peersRes)
          ? peersRes
          : (peersRes && Array.isArray(peersRes.result) ? peersRes.result : [])
        const result = statusArr[0] || null
        const peers = peersArr[0] || []
        if (result) {
          result.peers = peers || []
        }
        resolve(result)
      }).catch((err) => {
        reject(err)
      })
    })
  }

  pauseTask (params = {}) {
    const { gid } = params
    return this.client.call('pause', gid)
  }

  pauseAllTask () {
    return this.client.call('pauseAll')
  }

  forcePauseTask (params = {}) {
    const { gid } = params
    return this.client.call('forcePause', gid)
  }

  forcePauseAllTask () {
    return this.client.call('forcePauseAll')
  }

  resumeTask (params = {}) {
    const { gid } = params
    return this.client.call('unpause', gid)
  }

  resumeAllTask () {
    return this.client.call('unpauseAll')
  }

  removeTask (params = {}) {
    const { gid } = params
    return this.client.call('remove', gid)
  }

  forceRemoveTask (params = {}) {
    const { gid } = params
    return this.client.call('forceRemove', gid)
  }

  saveSession () {
    return this.client.call('saveSession')
  }

  purgeTaskRecord () {
    return this.client.call('purgeDownloadResult')
  }

  removeTaskRecord (params = {}) {
    const { gid } = params
    return this.client.call('removeDownloadResult', gid)
  }

  multicall (method, params = {}) {
    let { gids, options = {} } = params
    options = formatOptionsForEngine(options)
    const data = gids.map((gid) => {
      const _options = clone(options)
      const args = compactUndefined([gid, _options])
      return [method, ...args]
    })
    return this.client.multicall(data)
  }

  batchChangeOption (params = {}) {
    return this.multicall('aria2.changeOption', params)
  }

  batchRemoveTask (params = {}) {
    return this.multicall('aria2.remove', params)
  }

  batchResumeTask (params = {}) {
    return this.multicall('aria2.unpause', params)
  }

  batchPauseTask (params = {}) {
    return this.multicall('aria2.pause', params)
  }

  batchForcePauseTask (params = {}) {
    return this.multicall('aria2.forcePause', params)
  }
}
