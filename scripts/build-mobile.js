'use strict'

const path = require('node:path')
const { execSync } = require('node:child_process')

const rootDir = path.resolve(__dirname, '..')

function log (message) {
  console.log(`\x1b[36m[Motrix Mobile]\x1b[0m ${message}`)
}

function run (cmd, options = {}) {
  log(`Running: ${cmd}`)
  execSync(cmd, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options
  })
}

async function build () {
  const target = process.argv[2] || 'android'

  log('Building mobile web assets...')
  run('npx cross-env NODE_ENV=production webpack --progress --color --config .electron-vue/webpack.mobile.config.js')

  if (target === 'android') {
    log('Syncing with Android project...')
    run('npx cap copy android')
    run('npx cap sync android')
    log('Android build ready! Run "npm run open:android" to open in Android Studio.')
  }

  log('Build complete!')
}

build().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
