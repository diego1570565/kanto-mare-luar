import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.kantomareluar.app',
  appName: 'Kanto Maré & Luar',
  webDir: 'www',
  backgroundColor: '#0b4f4a',
  android: {
    backgroundColor: '#0b4f4a',
  },
  ios: {
    backgroundColor: '#0b4f4a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0b4f4a',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0b4f4a',
      style: 'DARK',
    },
  },
};

export default config;
