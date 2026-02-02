import { MD3LightTheme } from 'react-native-paper';
import { USF_GREEN, USF_GOLD } from './colors';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: USF_GREEN,
    secondary: USF_GOLD,
    background: '#FAFAFA',
    surface: '#FFFFFF',
    error: '#F44336',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
  },
  roundness: 12,
};

export type AppTheme = typeof theme;
