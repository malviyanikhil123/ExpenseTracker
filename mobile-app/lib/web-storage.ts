// Web storage adapter for auth store
export const webStorage = {
    getItemAsync: async (key: string) => {
        try {
            return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        } catch {
            return null;
        }
    },
    setItemAsync: async (key: string, value: string) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch {
            // Silently fail
        }
    },
    deleteItemAsync: async (key: string) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch {
            // Silently fail
        }
    },
};
