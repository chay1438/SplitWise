import { Colors } from './colors';

export const AppConfig = {
    // Global Background Settings
    defaultBackground: Colors.background,
    headerBackground: Colors.primary,
    authBackground: '#0B0B0B', // Dark theme for login/signup

    // Status Bar Settings
    statusBarStyle: 'light-content' as const,
    statusBarTranslucent: true,

    // App-wide Constants
    bottomTabHeight: 70,
    borderRadius: 12,
};
