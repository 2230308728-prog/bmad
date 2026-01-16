/**
 * API Client for backend communication
 * Supports JWT authentication and all HTTP methods
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    timestamp: string;
    version: string;
  };
}

// Backend returns double-nested structure: { data: { data: T, meta } }
// We unwrap it automatically so consumers can access response.data directly
interface BackendResponse<T> {
  data: ApiResponse<T>;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    console.log('[API] Setting auth token:', token.substring(0, 20) + '...');
    this.token = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.token = null;
  }

  /**
   * Add request to queue waiting for token refresh
   */
  private addRefreshSubscriber(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Process queued requests after successful token refresh
   */
  private onRefreshed(token: string): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    // Backend returns unwrapped response: { accessToken, refreshToken }
    const newAccessToken = data.accessToken;

    // Update stored tokens
    localStorage.setItem('access_token', newAccessToken);
    if (data.refreshToken) {
      localStorage.setItem('refresh_token', data.refreshToken);
    }
    this.token = newAccessToken;

    return newAccessToken;
  }

  /**
   * Get headers with auth token
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('[API] Adding auth header for request');
    } else {
      console.log('[API] WARNING: No auth token available for request');
    }

    return headers;
  }

  /**
   * Handle API errors and unwrap double-nested responses
   */
  private async handleResponse<T>(response: Response, originalRequest?: RequestInit): Promise<ApiResponse<T>> {
    if (response.status === 401) {
      // Token expired, try to refresh
      if (!this.isRefreshing) {
        this.isRefreshing = true;

        try {
          const newToken = await this.refreshAccessToken();
          this.isRefreshing = false;
          this.onRefreshed(newToken);

          // Retry original request with new token
          if (originalRequest) {
            const headers = { ...originalRequest.headers as HeadersInit, Authorization: `Bearer ${newToken}` };
            const retryResponse = await fetch(response.url, {
              ...originalRequest,
              headers,
            });

            if (!retryResponse.ok) {
              const error: ApiError = await retryResponse.json();
              throw new Error(error.message || `HTTP error! status: ${retryResponse.status}`);
            }

            const backendResponse: BackendResponse<T> = await retryResponse.json();
            return backendResponse.data;
          }
        } catch (error) {
          this.isRefreshing = false;
          // Refresh failed, clear tokens and redirect to login
          console.error('[API] Token refresh failed:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      } else {
        // Already refreshing, wait for new token
        return new Promise((resolve, reject) => {
          this.addRefreshSubscriber(async (token: string) => {
            try {
              const headers = { ...originalRequest!.headers as HeadersInit, Authorization: `Bearer ${token}` };
              const retryResponse = await fetch(response.url, {
                ...originalRequest!,
                headers,
              });

              if (!retryResponse.ok) {
                const error: ApiError = await retryResponse.json();
                reject(new Error(error.message || `HTTP error! status: ${retryResponse.status}`));
                return;
              }

              const backendResponse: BackendResponse<T> = await retryResponse.json();
              resolve(backendResponse.data);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const backendResponse: BackendResponse<T> = await response.json();
    // Unwrap double-nested structure
    return backendResponse.data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response, { method: 'GET', headers });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response, { method: 'POST', headers, body: JSON.stringify(data) });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response, { method: 'PUT', headers, body: JSON.stringify(data) });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response, { method: 'PATCH', headers, body: JSON.stringify(data) });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(response, { method: 'DELETE', headers });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
