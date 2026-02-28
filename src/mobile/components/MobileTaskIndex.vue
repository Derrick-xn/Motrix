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
  import { ADD_TASK_TYPE } from '@shared/constants'
  import TaskActions from '@/components/Task/TaskActions'
  import TaskList from '@/components/Task/TaskList'
  import { getTaskUri, parseHeader } from '@shared/utils'

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
      handleDeleteTask (payload) {
        const { task, taskName } = payload
        if (confirm(this.$t('task.delete-task-confirm', { taskName }))) {
          this.$store.dispatch('task/forcePauseTask', task)
            .finally(() => {
              this.$store.dispatch('task/removeTask', task)
                .then(() => this.$msg.success(this.$t('task.delete-task-success', { taskName })))
                .catch(() => this.$msg.error(this.$t('task.delete-task-fail', { taskName })))
            })
        }
      },
      handleDeleteTaskRecord (payload) {
        const { task, taskName } = payload
        if (confirm(this.$t('task.remove-record-confirm', { taskName }))) {
          this.$store.dispatch('task/removeTaskRecord', task)
            .then(() => this.$msg.success(this.$t('task.remove-record-success', { taskName })))
            .catch(() => this.$msg.error(this.$t('task.remove-record-fail', { taskName })))
        }
      }
    },
    created () {
      this.changeCurrentList()
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
