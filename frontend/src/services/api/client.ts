import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../../config/env';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store token getter function
let getAuthToken: (() => Promise<string | null>) | null = null;

// Function to set the token getter (called from AuthContext)
export const setTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter;
};

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get Clerk session token if available
    if (getAuthToken) {
      try {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      console.error('API Error:', message);

      // Create error with message and preserve response for status code checking
      const apiError: any = new Error(message);
      apiError.response = error.response;
      apiError.status = error.response.status;
      throw apiError;
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
      throw new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      console.error('Error:', error.message);
      throw error;
    }
  }
);

// Typed API client that accounts for the response interceptor unwrapping
const typedApiClient = {
  get: <T>(url: string): Promise<T> => {
    return apiClient.get(url) as Promise<T>;
  },
  post: <T>(url: string, data?: any): Promise<T> => {
    return apiClient.post(url, data) as Promise<T>;
  },
  put: <T>(url: string, data?: any): Promise<T> => {
    return apiClient.put(url, data) as Promise<T>;
  },
  delete: <T>(url: string): Promise<T> => {
    return apiClient.delete(url) as Promise<T>;
  },
  patch: <T>(url: string, data?: any): Promise<T> => {
    return apiClient.patch(url, data) as Promise<T>;
  },
};

export default typedApiClient;
