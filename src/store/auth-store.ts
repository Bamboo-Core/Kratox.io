import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  setAccessToken,
  getAccessToken,
  setLogoutCallback,
  setUserUpdateCallback,
  logoutApi,
} from '@/services/api-client';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);

interface User {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  tenantName: string;
  role: 'admin' | 'cliente';
  zabbix_hostgroup_ids: string[];
  phone_number: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  // Getter for token - returns current access token from memory
  // This maintains backwards compatibility with existing hooks
  token: string | null;
  login: (email: string, password: string, recaptchaToken?: string, rememberMe?: boolean) => Promise<{ requires2FA?: boolean; mfaToken?: string } | void>;
  logout: () => void;
  setUser: (user: User | null, token?: string) => void;
  verify2FA: (mfaToken: string, code: string, rememberDevice: boolean, rememberMe: boolean) => Promise<void>;
  resend2FA: (mfaToken: string) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      // Token is stored in memory via api-client, but we expose it here for backwards compatibility
      // Note: This will be null initially and updated after login/refresh
      token: null as string | null,

      login: async (email, password, recaptchaToken?: string, rememberMe?: boolean) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          credentials: 'include', // Important: allows cookies to be set
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, recaptchaToken, rememberMe }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.error || 'Login failed') as Error & {
            retryAfter?: number;
            attemptsRemaining?: number;
            isLocked?: boolean;
          };
          error.retryAfter = errorData.retryAfter;
          error.attemptsRemaining = errorData.attemptsRemaining;
          error.isLocked = response.status === 429;
          throw error;
        }

        const data = await response.json();

        if (data.requires2FA) {
          return { requires2FA: true, mfaToken: data.mfaToken };
        }

        const { accessToken, user } = data;

        // Store access token in memory (via api-client)
        setAccessToken(accessToken);

        // Store user in state (persisted to localStorage)
        // Also store token in state for backwards compatibility with existing hooks
        set({ user, token: accessToken, isAuthenticated: true, isInitialized: true });
      },

      logout: () => {
        // Call logout API to clear httpOnly cookie
        logoutApi();

        // Clear access token from memory
        setAccessToken(null);

        // Clear user from state
        set({ user: null, token: null, isAuthenticated: false });

        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      setUser: (user: User | null, newToken?: string) => {
        const tokenToSet = newToken || getAccessToken();
        set({ user, token: tokenToSet, isAuthenticated: !!user });
      },

      verify2FA: async (mfaToken, code, rememberDevice, rememberMe) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-2fa`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mfaToken, code, rememberDevice, rememberMe }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Verification failed');
        }

        const data = await response.json();
        const { accessToken, user } = data;

        setAccessToken(accessToken);
        set({ user, token: accessToken, isAuthenticated: true, isInitialized: true });
      },

      resend2FA: async (mfaToken) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/resend-2fa`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mfaToken }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to resend code');
        }
      },

      /**
       * Initialize auth state on app load
       * Tries to refresh the token using the httpOnly cookie
       */
      initialize: async () => {
        // If already initialized or no user data, skip
        const { user, isInitialized } = get();

        if (isInitialized) return;

        // If we have user data persisted, try to get a fresh access token
        if (user) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
              const data = await response.json();
              setAccessToken(data.accessToken);
              set({ user: data.user, token: data.accessToken, isAuthenticated: true, isInitialized: true });
            } else {
              // Refresh failed - clear state
              set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
            }
          } catch (error) {
            console.error('Failed to initialize auth:', error);
            set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
          }
        } else {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not the token (token is in memory)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, set up callbacks for the api-client
        if (state) {
          setLogoutCallback(() => state.logout());
          setUserUpdateCallback((user, token) => state.setUser(user, token));

          // Initialize auth (refresh token if we have user data)
          state.initialize();
        }
      },
    }
  )
);

// Getter for access token (used by hooks that need it)
export function getAuthToken(): string | null {
  return getAccessToken();
}
