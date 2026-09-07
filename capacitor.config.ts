import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.muslimguide.app',
  appName: 'Muslim Guide',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#0b1220'
  }
};

export default config;
