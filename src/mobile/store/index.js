import Vue from 'vue'
import Vuex from 'vuex'

import app from './modules/app'
import preference from './modules/preference'
import task from './modules/task'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    app,
    preference,
    task
  },
  strict: process.env.NODE_ENV !== 'production'
})
