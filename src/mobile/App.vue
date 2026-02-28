<template>
  <div id="app" class="mobile-app">
    <router-view />
    <mo-mobile-engine-client :secret="rpcSecret" />
  </div>
</template>

<script>
  import { mapGetters, mapState } from 'vuex'
  import { APP_THEME } from '@shared/constants'
  import MobileEngineClient from './components/MobileEngineClient.vue'
  import { getLanguage } from '@shared/locales'
  import { getLocaleManager } from '@/components/Locale'
  import { getSystemTheme } from './platform/native-shim'

  export default {
    name: 'motrix-mobile-app',
    components: {
      [MobileEngineClient.name]: MobileEngineClient
    },
    data () {
      return {
        systemTheme: getSystemTheme()
      }
    },
    computed: {
      ...mapState('preference', {
        rpcSecret: state => state.config.rpcSecret
      }),
      ...mapGetters('preference', [
        'theme',
        'locale',
        'direction'
      ]),
      themeClass () {
        if (this.theme === APP_THEME.AUTO) {
          return `theme-${this.systemTheme}`
        }
        return `theme-${this.theme}`
      },
      i18nClass () {
        return `i18n-${this.locale}`
      },
      directionClass () {
        return `dir-${this.direction}`
      }
    },
    methods: {
      updateRootClassName () {
        const { themeClass = '', i18nClass = '', directionClass = '' } = this
        const className = `mobile ${themeClass} ${i18nClass} ${directionClass}`
        document.documentElement.className = className
      },
      watchSystemTheme () {
        if (window.matchMedia) {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.systemTheme = e.matches ? APP_THEME.DARK : APP_THEME.LIGHT
            this.updateRootClassName()
          })
        }
      }
    },
    beforeMount () {
      this.updateRootClassName()
      this.watchSystemTheme()
    },
    watch: {
      locale (val) {
        const lng = getLanguage(val)
        getLocaleManager().changeLanguage(lng)
      },
      themeClass () {
        this.updateRootClassName()
      }
    }
  }
</script>

<style>
  .mobile-app {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
