import Vue from 'vue'
import VueI18Next from '@panter/vue-i18next'
import { sync } from 'vuex-router-sync'
import Element, { Loading, Message } from 'element-ui'

import App from './App.vue'
import router from './router'
import store from './store'
import { getLocaleManager } from '@/components/Locale'
import Icon from '@/components/Icons/Icon'
import Msg from '@/components/Msg'
import Aria2Engine from './plugins/aria2-engine'
import '@/components/Theme/Index.scss'
import './styles/mobile.scss'

const CONFIG_KEY = 'motrix-config'

function persistConfigPatch (patch = {}) {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    const current = raw ? JSON.parse(raw) : {}
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      ...current,
      ...patch
    }))
  } catch (err) {
    console.warn('[Motrix Mobile] failed to persist config patch:', err)
  }
}

async function ensureNativeEngine (config = {}) {
  try {
    const result = await Aria2Engine.startEngine({
      rpcPort: Number(config.rpcListenPort) || 16800,
      rpcSecret: config.rpcSecret || '',
      dir: config.dir || '',
      split: Number(config.split) || 16,
      btTracker: config.btTracker || '',
      maxConcurrentDownloads: Number(config.maxConcurrentDownloads) || 5,
      maxConnectionPerServer: Number(config.maxConnectionPerServer) || 16
    })

    if (result && result.message) {
      console.info('[Motrix Mobile] engine status:', result.message)
    }

    if (result && result.dir && result.dir !== config.dir) {
      const nextConfig = {
        ...config,
        dir: result.dir
      }
      persistConfigPatch({ dir: result.dir })
      store.dispatch('preference/updatePreference', nextConfig)
      return nextConfig
    }
  } catch (err) {
    console.error('[Motrix Mobile] failed to start native engine:', err)
  }

  return config
}

function init (config) {
  Vue.http = Vue.prototype.$http = null
  Vue.config.productionTip = false

  Vue.prototype.$electron = {
    ipcRenderer: {
      send: () => {},
      on: () => {},
      removeAllListeners: () => {}
    }
  }

  const { locale } = config
  const localeManager = getLocaleManager()
  localeManager.changeLanguageByLocale(locale)

  Vue.use(VueI18Next)
  const i18n = new VueI18Next(localeManager.getI18n())
  Vue.use(Element, {
    size: 'small',
    i18n: (key, value) => i18n.t(key, value)
  })
  Vue.use(Msg, Message, {
    showClose: true
  })
  Vue.component('mo-icon', Icon)

  const loading = Loading.service({
    fullscreen: true,
    background: 'rgba(0, 0, 0, 0.1)'
  })

  sync(store, router)

  global.app = new Vue({
    components: { App },
    router,
    store,
    i18n,
    template: '<App/>'
  }).$mount('#app')

  setTimeout(() => {
    loading.close()
  }, 400)
}

store.dispatch('preference/fetchPreference')
  .then(async (config) => {
    const readyConfig = await ensureNativeEngine(config)
    console.info('[Motrix Mobile] load preference:', readyConfig)
    init(readyConfig)
  })
  .catch((err) => {
    console.error('[Motrix Mobile] init error:', err)
    init({
      locale: navigator.language || 'en-US',
      theme: 'auto'
    })
  })
