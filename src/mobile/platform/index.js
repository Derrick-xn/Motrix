const IS_MOBILE = true
const IS_ANDROID = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)
const IS_IOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)

export const platform = {
  isMobile: () => IS_MOBILE,
  isAndroid: () => IS_ANDROID,
  isIOS: () => IS_IOS,
  isMacOS: () => false,
  isWindows: () => false,
  isLinux: () => false,
  isRenderer: () => false,
  is: {
    mobile: () => IS_MOBILE,
    android: () => IS_ANDROID,
    ios: () => IS_IOS,
    macOS: () => false,
    windows: () => false,
    linux: () => false,
    renderer: () => false,
    all: () => true
  }
}

export default platform
