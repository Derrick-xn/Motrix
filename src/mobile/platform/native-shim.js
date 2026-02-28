import { APP_THEME } from '@shared/constants'
import { getFileNameFromFile, isMagnetTask } from '@shared/utils'

export const showItemInFolder = (fullPath, { errorMsg } = {}) => {
  if (!fullPath) return
  console.log('[Mobile] showItemInFolder:', fullPath)
}

export const openItem = async (fullPath) => {
  if (!fullPath) return
  console.log('[Mobile] openItem:', fullPath)
  return ''
}

export const getTaskFullPath = (task) => {
  const { dir, files, bittorrent } = task
  let result = dir || ''

  if (isMagnetTask(task)) {
    return result
  }

  if (bittorrent && bittorrent.info && bittorrent.info.name) {
    result = `${result}/${bittorrent.info.name}`
    return result
  }

  const [file] = files || [{}]
  const path = file.path || ''
  let fileName = ''

  if (path) {
    result = path
  } else {
    if (files && files.length === 1) {
      fileName = getFileNameFromFile(file)
      if (fileName) {
        result = `${result}/${fileName}`
      }
    }
  }

  return result
}

export const moveTaskFilesToTrash = (task) => {
  if (isMagnetTask(task)) return true
  console.log('[Mobile] moveTaskFilesToTrash:', task)
  return true
}

export const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return APP_THEME.DARK
  }
  return APP_THEME.LIGHT
}

export const delayDeleteTaskFiles = (task, delay) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(moveTaskFilesToTrash(task))
    }, delay)
  })
}
