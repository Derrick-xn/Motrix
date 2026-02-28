<template>
  <div v-if="false"></div>
</template>

<script>
  import { mapState } from 'vuex'
  import api from './MobileApiInstance'
  import { checkTaskIsBT, getTaskName } from '@shared/utils'

  export default {
    name: 'mo-mobile-engine-client',
    computed: {
      ...mapState('app', {
        uploadSpeed: state => state.stat.uploadSpeed,
        downloadSpeed: state => state.stat.downloadSpeed,
        speed: state => state.stat.uploadSpeed + state.stat.downloadSpeed,
        interval: state => state.interval,
        downloading: state => state.stat.numActive > 0,
        progress: state => state.progress
      }),
      ...mapState('task', {
        seedingList: state => state.seedingList,
        taskDetailVisible: state => state.taskDetailVisible,
        enabledFetchPeers: state => state.enabledFetchPeers,
        currentTaskGid: state => state.currentTaskGid,
        currentTaskItem: state => state.currentTaskItem
      }),
      ...mapState('preference', {
        taskNotification: state => state.config.taskNotification
      }),
      currentTaskIsBT () {
        return checkTaskIsBT(this.currentTaskItem)
      }
    },
    methods: {
      async fetchTaskItem ({ gid }) {
        return api.fetchTaskItem({ gid })
          .catch((e) => {
            console.warn(`fetchTaskItem fail: ${e.message}`)
          })
      },
      onDownloadStart (event) {
        this.$store.dispatch('task/fetchList')
        this.$store.dispatch('app/resetInterval')
        this.$store.dispatch('task/saveSession')
        const [{ gid }] = event
        const { seedingList } = this
        if (seedingList.includes(gid)) return

        this.fetchTaskItem({ gid })
          .then((task) => {
            if (task) {
              const { dir } = task
              this.$store.dispatch('preference/recordHistoryDirectory', dir)
              const taskName = getTaskName(task)
              const message = this.$t('task.download-start-message', { taskName })
              this.$msg.info(message)
            }
          })
      },
      onDownloadStop (event) {
        const [{ gid }] = event
        this.fetchTaskItem({ gid })
          .then((task) => {
            if (task) {
              const taskName = getTaskName(task)
              const message = this.$t('task.download-stop-message', { taskName })
              this.$msg.info(message)
            }
          })
      },
      onDownloadError (event) {
        const [{ gid }] = event
        this.fetchTaskItem({ gid })
          .then((task) => {
            if (task) {
              const taskName = getTaskName(task)
              const message = this.$t('task.download-error-message', { taskName })
              this.$msg.error(message)
            }
          })
      },
      onDownloadComplete (event) {
        this.$store.dispatch('task/fetchList')
        const [{ gid }] = event
        this.$store.dispatch('task/removeFromSeedingList', gid)
        this.fetchTaskItem({ gid })
          .then((task) => {
            if (task) {
              this.handleDownloadComplete(task, false)
            }
          })
      },
      onBtDownloadComplete (event) {
        this.$store.dispatch('task/fetchList')
        const [{ gid }] = event
        const { seedingList } = this
        if (seedingList.includes(gid)) return
        this.$store.dispatch('task/addToSeedingList', gid)
        this.fetchTaskItem({ gid })
          .then((task) => {
            if (task) {
              this.handleDownloadComplete(task, true)
            }
          })
      },
      handleDownloadComplete (task, isBT) {
        this.$store.dispatch('task/saveSession')
        const taskName = getTaskName(task)
        const message = isBT
          ? this.$t('task.bt-download-complete-message', { taskName })
          : this.$t('task.download-complete-message', { taskName })
        this.$msg.success(message)

        if (this.taskNotification && 'Notification' in window) {
          const notifyMessage = isBT
            ? this.$t('task.bt-download-complete-notify')
            : this.$t('task.download-complete-notify')
          try {
            const notify = new Notification(notifyMessage, { body: taskName }) // eslint-disable-line no-new
            notify.onclick = () => {}
          } catch (e) {
            console.warn('[Mobile] Notification not supported:', e)
          }
        }
      },
      bindEngineEvents () {
        api.client.on('onDownloadStart', this.onDownloadStart)
        api.client.on('onDownloadStop', this.onDownloadStop)
        api.client.on('onDownloadComplete', this.onDownloadComplete)
        api.client.on('onDownloadError', this.onDownloadError)
        api.client.on('onBtDownloadComplete', this.onBtDownloadComplete)
      },
      unbindEngineEvents () {
        api.client.removeListener('onDownloadStart', this.onDownloadStart)
        api.client.removeListener('onDownloadStop', this.onDownloadStop)
        api.client.removeListener('onDownloadComplete', this.onDownloadComplete)
        api.client.removeListener('onDownloadError', this.onDownloadError)
        api.client.removeListener('onBtDownloadComplete', this.onBtDownloadComplete)
      },
      startPolling () {
        this.timer = setTimeout(() => {
          this.polling()
          this.startPolling()
        }, this.interval)
      },
      polling () {
        this.$store.dispatch('app/fetchGlobalStat')
        this.$store.dispatch('app/fetchProgress')
        this.$store.dispatch('task/fetchList')
        if (this.taskDetailVisible && this.currentTaskGid) {
          if (this.currentTaskIsBT && this.enabledFetchPeers) {
            this.$store.dispatch('task/fetchItemWithPeers', this.currentTaskGid)
          } else {
            this.$store.dispatch('task/fetchItem', this.currentTaskGid)
          }
        }
      },
      stopPolling () {
        clearTimeout(this.timer)
        this.timer = null
      },
      waitForEngine (retries = 0) {
        const maxRetries = 10
        const delay = retries < 3 ? 1000 : 2000
        api.getVersion()
          .then(() => {
            console.info('[Motrix Mobile] Engine connected')
            this.$store.dispatch('app/fetchEngineInfo')
            this.$store.dispatch('app/fetchEngineOptions')
            this.startPolling()
          })
          .catch(() => {
            if (retries < maxRetries) {
              console.info(`[Motrix Mobile] Waiting for engine... (${retries + 1}/${maxRetries})`)
              setTimeout(() => this.waitForEngine(retries + 1), delay)
            } else {
              console.error('[Motrix Mobile] Engine connection failed after retries')
              this.startPolling()
            }
          })
      }
    },
    created () {
      this.bindEngineEvents()
    },
    mounted () {
      this.waitForEngine()
    },
    destroyed () {
      this.$store.dispatch('task/saveSession')
      this.unbindEngineEvents()
      this.stopPolling()
    }
  }
</script>
