/**
 * Authentication utilities
 * This file will be expanded when authentication is implemented (Epic 2)
 */

export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

/**
 * Store auth token in localStorage (client-side only)
 */
export function setAuthToken(token: AuthToken): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', JSON.stringify(token));
  }
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): AuthToken | null {
  if (typeof window !== 'undefined') {
    const tokenStr = localStorage.getItem('auth_token');
    if (tokenStr) {
      return JSON.parse(tokenStr);
    }
  }
  return null;
}

/**
 * Clear auth token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Get current user info (to be implemented with backend)
 */
export function getCurrentUser(): AuthUser | null {
  // TODO: Implement user retrieval from token or backend
  return null;
}
