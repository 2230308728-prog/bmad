'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from './api-client';

/**
 * Authenticated user information
 */
export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
  role: 'ADMIN' | 'PARENT';
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication Context Type
 */
interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/**
 * Authentication Context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        console.log('[Auth] Initializing auth state from localStorage...');
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('auth_user');

        console.log('[Auth] storedToken:', storedToken ? 'exists' : 'null');
        console.log('[Auth] storedUser:', storedUser ? 'exists' : 'null');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('[Auth] Setting auth state:', { user: parsedUser });
          setAccessToken(storedToken);
          setUser(parsedUser);
          apiClient.setAuthToken(storedToken);
          console.log('[Auth] Auth state initialized successfully');
        } else {
          console.log('[Auth] No stored auth found');
        }
      } catch (error) {
        console.error('[Auth] Failed to load auth state:', error);
      } finally {
        setIsLoading(false);
        console.log('[Auth] Initialization complete, isLoading=false');
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('[Auth] Attempting login...');
      const response = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/admin/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user } = response.data;
      console.log('[Auth] Login successful:', { user, accessToken: accessToken.substring(0, 20) + '...' });

      // Store tokens and user info
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(user));
      console.log('[Auth] Stored to localStorage');

      // Update state
      setAccessToken(accessToken);
      setUser(user);
      apiClient.setAuthToken(accessToken);
      console.log('[Auth] Auth state updated');

      // Verify storage
      setTimeout(() => {
        const verifyToken = localStorage.getItem('access_token');
        const verifyUser = localStorage.getItem('auth_user');
        console.log('[Auth] Verification - access_token:', verifyToken ? 'exists' : 'MISSING');
        console.log('[Auth] Verification - auth_user:', verifyUser ? 'exists' : 'MISSING');
      }, 100);
    } finally {
      setIsLoading(false);
      console.log('[Auth] Login complete, isLoading=false');
    }
  };

  /**
   * Logout and clear auth state
   */
  const logout = (): void => {
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');

    // Clear state
    setAccessToken(null);
    setUser(null);
    apiClient.clearAuthToken();
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user && !!accessToken;

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Throws error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
