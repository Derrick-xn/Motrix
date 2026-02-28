<template>
  <div class="mobile-nav">
    <div class="mobile-nav-inner">
      <div
        v-for="item in navItems"
        :key="item.key"
        :class="['mobile-nav-item', { active: isActive(item) }]"
        @click="handleNav(item)"
      >
        <mo-icon :name="item.icon" width="22" height="22" />
        <span class="mobile-nav-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script>
  import { ADD_TASK_TYPE } from '@shared/constants'
  import '@/components/Icons/menu-task'
  import '@/components/Icons/menu-add'
  import '@/components/Icons/menu-preference'
  import '@/components/Icons/menu-about'

  export default {
    name: 'mo-mobile-nav',
    computed: {
      navItems () {
        return [
          { key: 'task', icon: 'menu-task', label: this.$t('task.active'), route: '/task' },
          { key: 'add', icon: 'menu-add', label: this.$t('task.new-task'), action: 'add' },
          { key: 'preference', icon: 'menu-preference', label: this.$t('preferences.general'), route: '/preference' },
          { key: 'about', icon: 'menu-about', label: this.$t('app.about'), action: 'about' }
        ]
      }
    },
    methods: {
      isActive (item) {
        if (!item.route) return false
        return this.$route.path.startsWith(item.route)
      },
      handleNav (item) {
        if (item.action === 'add') {
          this.$store.dispatch('app/showAddTaskDialog', ADD_TASK_TYPE.URI)
        } else if (item.action === 'about') {
          this.$store.dispatch('app/showAboutPanel')
        } else if (item.route) {
          this.$router.push({ path: item.route }).catch(() => {})
        }
      }
    }
  }
</script>

<style lang="scss">
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    padding-bottom: env(safe-area-inset-bottom, 0);

    .theme-dark & {
      background: rgba(30, 30, 46, 0.95);
      border-top-color: rgba(255, 255, 255, 0.08);
    }
  }

  .mobile-nav-inner {
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 56px;
    max-width: 500px;
    margin: 0 auto;
  }

  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 100%;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s;
    opacity: 0.5;

    &.active {
      opacity: 1;
    }

    svg {
      color: #333;
      .theme-dark & {
        color: #ccc;
      }
    }

    &.active svg {
      color: #5b5bfa;
    }
  }

  .mobile-nav-label {
    font-size: 10px;
    margin-top: 2px;
    color: #666;

    .theme-dark & {
      color: #999;
    }

    .mobile-nav-item.active & {
      color: #5b5bfa;
    }
  }
</style>
