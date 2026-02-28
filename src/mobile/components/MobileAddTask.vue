<template>
  <el-dialog
    custom-class="tab-title-dialog add-task-dialog mobile-add-task-dialog"
    width="92vw"
    :visible="visible"
    top="5vh"
    :show-close="false"
    :before-close="beforeClose"
    @open="handleOpen"
    @closed="handleClosed"
  >
    <el-form ref="taskForm" label-position="top" :model="form" :rules="rules">
      <el-tabs :value="type" @tab-click="handleTabClick">
        <el-tab-pane :label="$t('task.uri-task')" name="uri">
          <el-form-item>
            <el-input
              ref="uri"
              type="textarea"
              auto-complete="off"
              :autosize="{ minRows: 3, maxRows: 6 }"
              :placeholder="$t('task.uri-task-tips')"
              v-model="form.uris"
            >
            </el-input>
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane :label="$t('task.torrent-task')" name="torrent">
          <el-form-item>
            <div class="mobile-torrent-upload">
              <input
                type="file"
                accept=".torrent"
                @change="handleTorrentFileChange"
                class="mobile-file-input"
              />
              <div class="mobile-file-label">
                {{ torrentFileName || $t('task.select-torrent') }}
              </div>
            </div>
          </el-form-item>
        </el-tab-pane>
      </el-tabs>
      <el-form-item :label="`${$t('task.task-out')}:`">
        <el-input
          :placeholder="$t('task.task-out-tips')"
          v-model="form.out"
        >
        </el-input>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="14">
          <el-form-item :label="`${$t('task.task-dir')}:`">
            <el-input placeholder="" v-model="form.dir"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item :label="`${$t('task.task-split')}:`">
            <el-input-number
              v-model="form.split"
              controls-position="right"
              :min="1"
              :max="64"
              :label="$t('task.task-split')"
            >
            </el-input-number>
          </el-form-item>
        </el-col>
      </el-row>
      <div class="task-advanced-options" v-if="showAdvanced">
        <el-form-item :label="`${$t('task.task-user-agent')}:`">
          <el-input
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 3 }"
            :placeholder="$t('task.task-user-agent')"
            v-model="form.userAgent"
          ></el-input>
        </el-form-item>
        <el-form-item :label="`${$t('task.task-referer')}:`">
          <el-input
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 3 }"
            :placeholder="$t('task.task-referer')"
            v-model="form.referer"
          ></el-input>
        </el-form-item>
        <el-form-item :label="`${$t('task.task-cookie')}:`">
          <el-input
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 3 }"
            :placeholder="$t('task.task-cookie')"
            v-model="form.cookie"
          ></el-input>
        </el-form-item>
      </div>
    </el-form>
    <button
      slot="title"
      type="button"
      class="el-dialog__headerbtn"
      aria-label="Close"
      @click="handleClose">
      <i class="el-dialog__close el-icon el-icon-close"></i>
    </button>
    <div slot="footer" class="dialog-footer">
      <el-checkbox class="chk" v-model="showAdvanced">
        {{ $t('task.show-advanced-options') }}
      </el-checkbox>
      <div class="mobile-dialog-buttons">
        <el-button @click="handleCancel">{{ $t('app.cancel') }}</el-button>
        <el-button type="primary" @click="submitForm('taskForm')">{{ $t('app.submit') }}</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
  import { mapState } from 'vuex'
  import { isEmpty } from 'lodash'
  import {
    initTaskForm,
    buildUriPayload,
    buildTorrentPayload
  } from '@/utils/task'
  import { ADD_TASK_TYPE } from '@shared/constants'
  import { detectResource } from '@shared/utils'

  export default {
    name: 'mo-mobile-add-task',
    props: {
      visible: { type: Boolean, default: false },
      type: { type: String, default: ADD_TASK_TYPE.URI }
    },
    data () {
      return {
        showAdvanced: false,
        form: {},
        rules: {},
        torrentFileName: ''
      }
    },
    computed: {
      ...mapState('preference', {
        config: state => state.config
      })
    },
    methods: {
      async autofillResourceLink () {
        try {
          const content = await navigator.clipboard.readText()
          const hasResource = detectResource(content)
          if (hasResource && isEmpty(this.form.uris)) {
            this.form.uris = content
          }
        } catch (e) {
          // clipboard permission denied on mobile
        }
      },
      beforeClose () {
        if (isEmpty(this.form.uris) && isEmpty(this.form.torrent)) {
          this.handleClose()
        }
      },
      handleOpen () {
        this.form = initTaskForm(this.$store.state)
        if (this.type === ADD_TASK_TYPE.URI) {
          this.autofillResourceLink()
        }
      },
      handleCancel () {
        this.$store.dispatch('app/hideAddTaskDialog')
      },
      handleClose () {
        this.$store.dispatch('app/hideAddTaskDialog')
        this.$store.dispatch('app/updateAddTaskOptions', {})
      },
      handleClosed () {
        this.reset()
      },
      handleTabClick (tab) {
        this.$store.dispatch('app/changeAddTaskType', tab.name)
      },
      handleTorrentFileChange (e) {
        const file = e.target.files[0]
        if (!file) return
        this.torrentFileName = file.name
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result.split(',')[1]
          this.form.torrent = base64
        }
        reader.readAsDataURL(file)
      },
      reset () {
        this.showAdvanced = false
        this.torrentFileName = ''
        this.form = initTaskForm(this.$store.state)
      },
      addTask (type, form) {
        if (type === ADD_TASK_TYPE.URI) {
          const payload = buildUriPayload(form)
          this.$store.dispatch('task/addUri', payload).catch(err => {
            this.$msg.error(err.message)
          })
        } else if (type === ADD_TASK_TYPE.TORRENT) {
          const payload = buildTorrentPayload(form)
          this.$store.dispatch('task/addTorrent', payload).catch(err => {
            this.$msg.error(err.message)
          })
        }
      },
      submitForm (formName) {
        this.$refs[formName].validate(valid => {
          if (!valid) return false
          try {
            this.addTask(this.type, this.form)
            this.$store.dispatch('app/hideAddTaskDialog')
            if (this.form.newTaskShowDownloading) {
              this.$router.push({ path: '/task/active' }).catch(() => {})
            }
          } catch (err) {
            this.$msg.error(this.$t(err.message))
          }
        })
      }
    }
  }
</script>

<style lang="scss">
  .mobile-add-task-dialog {
    border-radius: 16px !important;
    .el-dialog__body {
      padding: 16px 20px !important;
    }
    .el-form-item__label {
      font-size: 13px;
      padding-bottom: 4px !important;
    }
    .el-input-number.el-input-number--small {
      width: 100%;
    }
    .el-dialog__footer {
      padding: 12px 20px !important;
    }
  }

  .mobile-dialog-buttons {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    .el-button {
      flex: 1;
    }
  }

  .mobile-torrent-upload {
    position: relative;
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    cursor: pointer;

    .theme-dark & {
      border-color: #444;
    }
  }

  .mobile-file-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .mobile-file-label {
    font-size: 14px;
    color: #999;
  }
</style>
