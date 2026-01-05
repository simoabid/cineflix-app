import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, User, setAuthToken, getAuthToken } from '../services/api';


interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, name: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateProfile: (data: { name?: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = getAuthToken();
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await authApi.getMe();
                if (response.success && response.data) {
                    setUser(response.data.user);
                } else {
                    // Token invalid, clear it
                    setAuthToken(null);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                setAuthToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const response = await authApi.login(email, password);
            if (response.success && response.data) {
                setAuthToken(response.data.token);
                setUser(response.data.user);
                return { success: true };
            }
            return { success: false, error: response.error || 'Login failed' };
        } catch (error) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }, []);

    const register = useCallback(async (email: string, password: string, name: string, avatar?: string) => {
        try {
            const response = await authApi.register(email, password, name, avatar);
            if (response.success && response.data) {
                setAuthToken(response.data.token);
                setUser(response.data.user);
                return { success: true };
            }
            return { success: false, error: response.error || 'Registration failed' };
        } catch (error) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } finally {
            setAuthToken(null);
            setUser(null);
        }
    }, []);

    const updateProfile = useCallback(async (data: { name?: string; avatar?: string }) => {
        try {
            const response = await authApi.updateProfile(data);
            if (response.success && response.data) {
                setUser(response.data.user);
                return { success: true };
            }
            return { success: false, error: response.error || 'Update failed' };
        } catch (error) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }, []);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
        try {
            const response = await authApi.changePassword(currentPassword, newPassword);
            if (response.success) {
                return { success: true };
            }
            return { success: false, error: response.error || 'Password change failed' };
        } catch (error) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }, []);

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        changePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
