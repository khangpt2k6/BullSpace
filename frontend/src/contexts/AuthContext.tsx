import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { User } from '../types/models';
import { setTokenGetter } from '../services/api/client';

interface AuthContextType {
  user: User | null;
  clerkUserId: string | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { signOut, getToken } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up token getter for API client
  useEffect(() => {
    setTokenGetter(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error('Error getting Clerk token:', error);
        return null;
      }
    });
  }, [getToken]);

  // Sync Clerk user with our User model
  useEffect(() => {
    if (isClerkLoaded) {
      if (clerkUser) {
        // Map Clerk user to our User model
        const mappedUser: User = {
          _id: clerkUser.id, // Use Clerk ID as our user ID
          name: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          role: 'student', // Default role, can be customized based on Clerk metadata
        };
        setUser(mappedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [clerkUser, isClerkLoaded]);

  const login = (newUser: User) => {
    // This is now handled by Clerk, but keeping for compatibility
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        clerkUserId: clerkUser?.id || null,
        login,
        logout,
        isAuthenticated,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
