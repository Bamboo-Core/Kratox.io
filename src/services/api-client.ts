/**
 * Centralized API client with automatic token refresh
 *
 * This module handles:
 * - Access token storage in memory (not localStorage for security)
 * - Automatic token refresh when access token expires
 * - Request queuing during token refresh
 * - Logout on refresh failure
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);

// Access token stored in memory (more secure than localStorage)
let accessToken: string | null = null;

// Flag to track if we're currently refreshing
let isRefreshing = false;

// Queue of requests waiting for token refresh
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

// Callback for logout (will be set by auth store)
let onLogout: (() => void) | null = null;

// Callback for updating user data and token after refresh
let onUserUpdate: ((user: any, token: string) => void) | null = null;

/**
 * Set the access token (called after login or refresh)
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Set the logout callback
 */
export function setLogoutCallback(callback: () => void): void {
  onLogout = callback;
}

/**
 * Set the user update callback
 */
export function setUserUpdateCallback(callback: (user: any, token: string) => void): void {
  onUserUpdate = callback;
}

/**
 * Process the refresh queue after getting a new token
 */
function processQueue(error: Error | null, token: string | null): void {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  refreshQueue = [];
}

/**
 * Refresh the access token using the httpOnly refresh token cookie
 */
async function refreshAccessToken(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Important: sends cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    setAccessToken(data.accessToken);

    // Update user data and token if callback is set
    if (onUserUpdate && data.user) {
      onUserUpdate(data.user, data.accessToken);
    }

    return data.accessToken;
  } catch (error) {
    // Refresh failed - logout user
    setAccessToken(null);
    if (onLogout) {
      onLogout();
    }
    throw error;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidToken(): Promise<string> {
  // If we have a token, return it (the server will tell us if it's expired)
  if (accessToken) {
    return accessToken;
  }

  // If we're already refreshing, wait for it
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  // Try to refresh
  isRefreshing = true;

  try {
    const token = await refreshAccessToken();
    processQueue(null, token);
    return token;
  } catch (error) {
    processQueue(error as Error, null);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 */
export async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getValidToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // If we get a 401, try to refresh the token and retry
  if (response.status === 401) {
    // Clear current token
    setAccessToken(null);

    // If we're already refreshing, wait for it
    if (isRefreshing) {
      const newToken = await new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      });

      // Retry with new token
      const retryResponse = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (!retryResponse.ok && retryResponse.status !== 204) {
        const errorData = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.error || errorData.message || `HTTP error ${retryResponse.status}`);
      }

      if (retryResponse.status === 204) return null as T;
      return retryResponse.json();
    }

    // Try to refresh
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);

      // Retry with new token
      const retryResponse = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (!retryResponse.ok && retryResponse.status !== 204) {
        const errorData = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.error || errorData.message || `HTTP error ${retryResponse.status}`);
      }

      if (retryResponse.status === 204) return null as T;
      return retryResponse.json();
    } catch (error) {
      processQueue(error as Error, null);
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
  }

  if (response.status === 204) return null as T;
  return response.json();
}

/**
 * Make an authenticated blob request (for file downloads)
 */
export async function fetchBlobWithAuth(url: string, options: RequestInit = {}): Promise<Blob> {
  const token = await getValidToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Try refresh and retry
    setAccessToken(null);
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);

      const retryResponse = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        credentials: 'include',
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }

      return retryResponse.blob();
    } catch (error) {
      processQueue(error as Error, null);
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.blob();
}

/**
 * Logout - clear token and call logout endpoint
 */
export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setAccessToken(null);
  }
}
