import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lunawallet.crypto',
  appName: 'Luna Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'tonconnect',
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0a0a0f',
      style: 'DARK',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      style: 'DARK',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      androidSpinnerStyle: 'small',
    },
    Haptics: {
      enabled: true,
    },
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a0f',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    allowsLinkPreview: false,
    minimumOSVersion: '15.0',
  },
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: false,
    captureInput: true,
    useLegacyBridge: false,
    minSdkVersion: 26,
    targetSdkVersion: 34,
  },
};

export default config;