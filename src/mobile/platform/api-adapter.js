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
    'continue': true,
    'user-agent': 'Motrix/1.8.19'
  }
}

export default class MobileApi {
  constructor (options = {}) {
    this.options = options
    this.init()
  }

  async init () {
    this.config = await this.loadConfig()
    this.client = this.initClient()
    this.client.open()
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
      rpcListenPort: port,
      rpcSecret: secret
    } = this.config
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

  fetchPreference () {
    return new Promise((resolve) => {
      this.config = this.loadConfig()
      resolve(this.config)
    })
  }

  savePreference (params = {}) {
    const kebabParams = changeKeysToKebabCase(params)
    this.saveConfigToLocalStorage(kebabParams)

    const { user, system } = separateConfig(kebabParams)
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
      const engineOptions = formatOptionsForEngine(options)
      if (outs && outs[index]) {
        engineOptions.out = outs[index]
      }
      const args = compactUndefined([[uri], engineOptions])
      return ['aria2.addUri', ...args]
    })
    return this.client.multicall(tasks)
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
      this.client.multicall([
        ['aria2.tellActive', ...activeArgs],
        ['aria2.tellWaiting', ...waitingArgs]
      ]).then((data) => {
        const result = mergeTaskResult(data)
        resolve(result)
      }).catch((err) => {
        reject(err)
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
        const result = data[0] && data[0][0]
        const peers = data[1] && data[1][0]
        result.peers = peers || []
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
