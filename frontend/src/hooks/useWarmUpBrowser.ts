import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Hook to warm up the browser for OAuth flows
 * This improves the user experience by preloading the browser
 * Only works on native platforms (iOS, Android), not web
 */
export const useWarmUpBrowser = () => {
  useEffect(() => {
    // Only warm up on native platforms
    if (Platform.OS !== 'web') {
      void WebBrowser.warmUpAsync();

      return () => {
        void WebBrowser.coolDownAsync();
      };
    }
  }, []);
};
