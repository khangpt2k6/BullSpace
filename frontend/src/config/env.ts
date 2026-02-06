// Environment configuration
const __DEV__ = process.env.NODE_ENV === 'development';

export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://bullroom-api-gateway.onrender.com';

export const SOCKET_URL = __DEV__
  ? 'http://localhost:3003'
  : 'https://bullroom-notification-service.onrender.com';

export const API_TIMEOUT = 10000; // 10 seconds
export const BOOKING_HOLD_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Clerk Authentication
// TODO: Replace with your actual Clerk Publishable Key from https://dashboard.clerk.com
export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE';
