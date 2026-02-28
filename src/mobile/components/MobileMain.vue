<template>
  <el-container id="container" class="mobile-container">
    <mo-mobile-nav />
    <router-view />
    <mo-mobile-add-task :visible="addTaskVisible" :type="addTaskType" />
    <mo-about-panel :visible="aboutPanelVisible" />
    <mo-task-detail
      :visible="taskDetailVisible"
      :gid="currentTaskGid"
      :task="currentTaskItem"
      :files="currentTaskFiles"
      :peers="currentTaskPeers"
    />
  </el-container>
</template>

<script>
  import { mapState } from 'vuex'
  import AboutPanel from '@/components/About/AboutPanel'
  import TaskDetail from '@/components/TaskDetail/Index'
  import MobileNav from './MobileNav.vue'
  import MobileAddTask from './MobileAddTask.vue'

  export default {
    name: 'mo-mobile-main',
    components: {
      [AboutPanel.name]: AboutPanel,
      [TaskDetail.name]: TaskDetail,
      'mo-mobile-nav': MobileNav,
      'mo-mobile-add-task': MobileAddTask
    },
    computed: {
      ...mapState('app', {
        aboutPanelVisible: state => state.aboutPanelVisible,
        addTaskVisible: state => state.addTaskVisible,
        addTaskType: state => state.addTaskType
      }),
      ...mapState('task', {
        taskDetailVisible: state => state.taskDetailVisible,
        currentTaskGid: state => state.currentTaskGid,
        currentTaskItem: state => state.currentTaskItem,
        currentTaskFiles: state => state.currentTaskFiles,
        currentTaskPeers: state => state.currentTaskPeers
      })
    }
  }
</script>

<style lang="scss">
  .mobile-container {
    flex-direction: column !important;
    height: 100%;
  }
</style>
