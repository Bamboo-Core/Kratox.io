
import { create } from 'zustand';

interface UIState {
    notificationsCount: number;
    incrementNotifications: () => void;
    decrementNotifications: () => void;
    setNotificationsCount: (count: number) => void;
}

/**
 * Zustand store for managing global UI state.
 *
 * @example
 * import { useUIStore } from '@/store/ui-store';
 *
 * function MyComponent() {
 *   const notificationsCount = useUIStore((state) => state.notificationsCount);
 *   const increment = useUIStore((state) => state.incrementNotifications);
 *
 *   return (
 *     <div>
 *       <p>Notifications: {notificationsCount}</p>
 *       <button onClick={increment}>Increment</button>
 *     </div>
 *   );
 * }
 */
export const useUIStore = create<UIState>((set) => ({
    notificationsCount: 0,
    incrementNotifications: () => set((state) => ({ notificationsCount: state.notificationsCount + 1 })),
    decrementNotifications: () => {
        set((state) => ({
            notificationsCount: Math.max(0, state.notificationsCount - 1), // Ensure count doesn't go below 0
        }));
    },
    setNotificationsCount: (count) => set({ notificationsCount: Math.max(0, count) }), // Ensure count isn't set below 0
}));
