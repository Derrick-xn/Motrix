const noop = () => {}

export const access = (path, mode, callback) => {
  if (typeof mode === 'function') {
    callback = mode
  }
  if (callback) {
    callback(new Error('fs.access is not supported in mobile'))
  }
}

export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1
}

export const readFile = (path, opts, cb) => {
  if (typeof opts === 'function') {
    cb = opts
  }
  if (cb) cb(new Error('fs.readFile is not supported in mobile'))
}

export const writeFile = (path, data, opts, cb) => {
  if (typeof opts === 'function') {
    cb = opts
  }
  if (cb) cb(new Error('fs.writeFile is not supported in mobile'))
}

export const existsSync = () => false
export const readFileSync = () => ''
export const writeFileSync = noop
export const mkdirSync = noop
export const readdirSync = () => []
export const statSync = () => ({ isFile: () => false, isDirectory: () => false })
export const unlinkSync = noop

export default {
  access,
  constants,
  readFile,
  writeFile,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync
}
