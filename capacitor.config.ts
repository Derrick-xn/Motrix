import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.motrix.android',
  appName: 'Motrix',
  webDir: 'dist/mobile',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    }
  },
  android: {
    backgroundColor: '#1a1a2e',
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
