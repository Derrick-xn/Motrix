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
import '@/components/Theme/Index.scss'
import './styles/mobile.scss'

async function startNativeEngine () {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const Aria2Engine = (await import('./plugins/aria2-engine')).default
      console.info('[Motrix Mobile] Starting native aria2 engine...')
      const result = await Aria2Engine.startEngine({
        rpcPort: 16800,
        rpcSecret: '',
        dir: '/storage/emulated/0/Download',
        maxConcurrentDownloads: 5,
        maxConnectionPerServer: 16
      })
      console.info('[Motrix Mobile] Engine start result:', result)
      return result
    }
  } catch (e) {
    console.warn('[Motrix Mobile] Failed to start native engine:', e)
  }
  return null
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

startNativeEngine()
  .then(() => store.dispatch('preference/fetchPreference'))
  .then((config) => {
    console.info('[Motrix Mobile] load preference:', config)
    init(config)
  })
  .catch((err) => {
    console.error('[Motrix Mobile] init error:', err)
    init({
      locale: navigator.language || 'en-US',
      theme: 'auto'
    })
  })
