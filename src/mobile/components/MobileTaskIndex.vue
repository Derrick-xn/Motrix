<template>
  <el-container
    class="mobile-task-panel"
    direction="vertical"
  >
    <el-header class="mobile-task-header" height="auto">
      <div class="mobile-task-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['mobile-task-tab', { active: status === tab.key }]"
          @click="switchTab(tab.key)"
        >
          {{ tab.title }}
          <span v-if="getCount(tab.key) > 0" class="mobile-task-count">{{ getCount(tab.key) }}</span>
        </div>
      </div>
      <mo-task-actions />
    </el-header>
    <el-main class="mobile-task-content">
      <mo-task-list />
    </el-main>
  </el-container>
</template>

<script>
  import { mapState } from 'vuex'
  import { commands } from '@/components/CommandManager/instance'
  import { ADD_TASK_TYPE } from '@shared/constants'
  import { getTaskUri, parseHeader } from '@shared/utils'
  import TaskActions from '@/components/Task/TaskActions'
  import TaskList from '@/components/Task/TaskList'

  export default {
    name: 'mo-mobile-task-index',
    components: {
      [TaskActions.name]: TaskActions,
      [TaskList.name]: TaskList
    },
    props: {
      status: {
        type: String,
        default: 'active'
      }
    },
    computed: {
      ...mapState('task', {
        taskList: state => state.taskList,
        selectedGidList: state => state.selectedGidList
      }),
      ...mapState('preference', {
        noConfirmBeforeDelete: state => state.config.noConfirmBeforeDeleteTask
      }),
      ...mapState('app', {
        stat: state => state.stat
      }),
      tabs () {
        return [
          { key: 'active', title: this.$t('task.active') },
          { key: 'waiting', title: this.$t('task.waiting') },
          { key: 'stopped', title: this.$t('task.stopped') }
        ]
      }
    },
    watch: {
      status: 'onStatusChange'
    },
    methods: {
      directAddTask (uri, options = {}) {
        const uris = [uri]
        const payload = {
          uris,
          options: {
            ...options
          }
        }
        this.$store.dispatch('task/addUri', payload)
          .catch((err) => {
            this.$msg.error(err.message)
          })
      },
      showAddTaskDialog (uri, options = {}) {
        const {
          header,
          ...rest
        } = options
        const headers = parseHeader(header)
        const newOptions = {
          ...rest,
          ...headers
        }

        this.$store.dispatch('app/updateAddTaskUrl', uri)
        this.$store.dispatch('app/updateAddTaskOptions', newOptions)
        this.$store.dispatch('app/showAddTaskDialog', ADD_TASK_TYPE.URI)
      },
      removeTask (task, taskName, isRemoveWithFiles = false) {
        this.$store.dispatch('task/forcePauseTask', task)
          .finally(() => {
            return this.removeTaskItem(task, taskName, isRemoveWithFiles)
          })
      },
      removeTaskRecord (task, taskName, isRemoveWithFiles = false) {
        this.$store.dispatch('task/forcePauseTask', task)
          .finally(() => {
            return this.removeTaskRecordItem(task, taskName, isRemoveWithFiles)
          })
      },
      async removeTaskItem (task, taskName) {
        try {
          await this.$store.dispatch('task/removeTask', task)
          this.$msg.success(this.$t('task.delete-task-success', {
            taskName
          }))
        } catch ({ code }) {
          if (code === 1) {
            this.$msg.error(this.$t('task.delete-task-fail', {
              taskName
            }))
          }
        }
      },
      async removeTaskRecordItem (task, taskName) {
        try {
          await this.$store.dispatch('task/removeTaskRecord', task)
          this.$msg.success(this.$t('task.remove-record-success', {
            taskName
          }))
        } catch ({ code }) {
          if (code === 1) {
            this.$msg.error(this.$t('task.remove-record-fail', {
              taskName
            }))
          }
        }
      },
      removeTasks (taskList) {
        const gids = taskList.map((task) => task.gid)
        this.$store.dispatch('task/batchRemoveTask', gids)
          .then(() => {
            this.$msg.success(this.$t('task.batch-delete-task-success'))
          })
          .catch(({ code }) => {
            if (code === 1) {
              this.$msg.error(this.$t('task.batch-delete-task-fail'))
            }
          })
      },
      onStatusChange () {
        this.changeCurrentList()
      },
      changeCurrentList () {
        this.$store.dispatch('task/changeCurrentList', this.status)
      },
      switchTab (key) {
        this.$router.push({ path: `/task/${key}` }).catch(() => {})
      },
      getCount (key) {
        if (!this.stat) return 0
        if (key === 'active') return this.stat.numActive + this.stat.numWaiting
        if (key === 'waiting') return this.stat.numWaiting
        if (key === 'stopped') return this.stat.numStopped
        return 0
      },
      handlePauseTask (payload) {
        const { task, taskName } = payload
        this.$msg.info(this.$t('task.download-pause-message', { taskName }))
        this.$store.dispatch('task/pauseTask', task)
          .catch(({ code }) => {
            if (code === 1) {
              this.$msg.error(this.$t('task.pause-task-fail', { taskName }))
            }
          })
      },
      handleResumeTask (payload) {
        const { task, taskName } = payload
        this.$store.dispatch('task/resumeTask', task)
          .catch(({ code }) => {
            if (code === 1) {
              this.$msg.error(this.$t('task.resume-task-fail', {
                taskName
              }))
            }
          })
      },
      handleStopTaskSeeding (payload) {
        const { task } = payload
        this.$store.dispatch('task/stopSeeding', task)
        this.$msg.info({
          message: this.$t('task.bt-stopping-seeding-tip'),
          duration: 8000
        })
      },
      handleRestartTask (payload) {
        const { task, taskName, showDialog } = payload
        const { gid } = task
        const uri = getTaskUri(task)

        this.$store.dispatch('task/getTaskOption', gid)
          .then((data) => {
            const { dir, header, split } = data
            const options = {
              dir,
              header,
              split,
              out: taskName
            }

            if (showDialog) {
              this.showAddTaskDialog(uri, options)
            } else {
              this.directAddTask(uri, options)
              this.$store.dispatch('task/removeTaskRecord', task)
            }
          })
      },
      handleDeleteTask (payload) {
        const { task, taskName, deleteWithFiles } = payload
        const { noConfirmBeforeDelete } = this

        if (noConfirmBeforeDelete) {
          this.removeTask(task, taskName, deleteWithFiles)
          return
        }

        if (confirm(this.$t('task.delete-task-confirm', { taskName }))) {
          this.removeTask(task, taskName, deleteWithFiles)
        }
      },
      handleDeleteTaskRecord (payload) {
        const { task, taskName, deleteWithFiles } = payload
        const { noConfirmBeforeDelete } = this

        if (noConfirmBeforeDelete) {
          this.removeTaskRecord(task, taskName, deleteWithFiles)
          return
        }

        if (confirm(this.$t('task.remove-record-confirm', { taskName }))) {
          this.removeTaskRecord(task, taskName, deleteWithFiles)
        }
      },
      handleBatchDeleteTask (payload) {
        const { deleteWithFiles } = payload
        const { selectedGidList, taskList, noConfirmBeforeDelete } = this
        const selectedTaskList = selectedGidList.length > 0
          ? taskList.filter((task) => selectedGidList.includes(task.gid))
          : taskList

        if (selectedTaskList.length === 0) return

        if (noConfirmBeforeDelete) {
          this.removeTasks(selectedTaskList, deleteWithFiles)
          return
        }

        const count = `${selectedTaskList.length}`
        if (confirm(this.$t('task.batch-delete-task-confirm', { count }))) {
          this.removeTasks(selectedTaskList, deleteWithFiles)
        }
      },
      handleCopyTaskLink (payload) {
        const { task } = payload
        const uri = getTaskUri(task)
        if (!navigator.clipboard) {
          this.$msg.error(this.$t('task.copy-link-fail'))
          return
        }
        navigator.clipboard.writeText(uri)
          .then(() => {
            this.$msg.success(this.$t('task.copy-link-success'))
          })
          .catch(() => {
            this.$msg.error(this.$t('task.copy-link-fail'))
          })
      },
      handleShowTaskInfo (payload) {
        const { task } = payload
        this.$store.dispatch('task/showTaskDetail', task)
      }
    },
    created () {
      this.changeCurrentList()
    },
    mounted () {
      commands.on('pause-task', this.handlePauseTask)
      commands.on('resume-task', this.handleResumeTask)
      commands.on('stop-task-seeding', this.handleStopTaskSeeding)
      commands.on('restart-task', this.handleRestartTask)
      commands.on('delete-task', this.handleDeleteTask)
      commands.on('delete-task-record', this.handleDeleteTaskRecord)
      commands.on('batch-delete-task', this.handleBatchDeleteTask)
      commands.on('copy-task-link', this.handleCopyTaskLink)
      commands.on('show-task-info', this.handleShowTaskInfo)
    },
    destroyed () {
      commands.off('pause-task', this.handlePauseTask)
      commands.off('resume-task', this.handleResumeTask)
      commands.off('stop-task-seeding', this.handleStopTaskSeeding)
      commands.off('restart-task', this.handleRestartTask)
      commands.off('delete-task', this.handleDeleteTask)
      commands.off('delete-task-record', this.handleDeleteTaskRecord)
      commands.off('batch-delete-task', this.handleBatchDeleteTask)
      commands.off('copy-task-link', this.handleCopyTaskLink)
      commands.off('show-task-info', this.handleShowTaskInfo)
    }
  }
</script>

<style lang="scss">
  .mobile-task-panel {
    height: 100%;
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-task-header {
    padding: 12px 16px 0 !important;
    height: auto !important;
    background: transparent;
  }

  .mobile-task-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 12px;
    background: rgba(0, 0, 0, 0.04);
    border-radius: 10px;
    padding: 3px;

    .theme-dark & {
      background: rgba(255, 255, 255, 0.06);
    }
  }

  .mobile-task-tab {
    flex: 1;
    text-align: center;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;

    &.active {
      background: #fff;
      color: #333;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      .theme-dark & {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
    }

    .theme-dark & {
      color: #999;
    }
  }

  .mobile-task-count {
    display: inline-block;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    font-size: 10px;
    text-align: center;
    background: #5b5bfa;
    color: #fff;
    border-radius: 8px;
    padding: 0 4px;
    margin-left: 4px;
  }

  .mobile-task-content {
    padding: 0 !important;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
</style>
