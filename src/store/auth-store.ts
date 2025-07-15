import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');

interface User {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  tenantName: string;
  role: 'admin' | 'collaborator';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // To track initial loading from storage
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  _setIsLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true, // Start as loading
      
      login: async (email, password) => {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Login failed');
        }

        const { user, token } = await response.json();
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        // Optionally, clear other stores or caches here
        // Also redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      // Internal action to update loading state
      _setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      onRehydrate: () => {
        // This is called when the store is rehydrated from storage
        useAuthStore.getState()._setIsLoading(false); // Set loading to false once done
      },
    }
  )
);

// Manually set isLoading to false on initial client-side load if rehydration doesn't happen
// (e.g., on first visit with an empty localStorage)
if (typeof window !== 'undefined') {
    useAuthStore.getState()._setIsLoading(false);
}
