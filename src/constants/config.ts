import { Colors } from './colors';

export const AppConfig = {
    // Global Background Settings
    defaultBackground: Colors.background,
    headerBackground: Colors.primary,
    authBackground: '#0B0B0B', // Dark theme for login/signup

    // Status Bar Settings
    statusBarStyle: 'dark-content' as const,
    statusBarTranslucent: true,

    // App-wide Constants
    bottomTabHeight: 60,
    borderRadius: 12,
};
