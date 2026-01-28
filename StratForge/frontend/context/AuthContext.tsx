'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, getMe, login as authLogin, logout as authLogout, register as authRegister } from '../lib/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, username?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Check for existing session on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await getMe();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await authLogin(email, password);
        setUser(response.user);
        router.push('/dashboard');
    }, [router]);

    const register = useCallback(async (email: string, password: string, username?: string) => {
        await authRegister(email, password, username);
        router.push('/login?registered=true');
    }, [router]);

    const logout = useCallback(() => {
        authLogout();
        setUser(null);
        router.push('/login');
    }, [router]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// HOC for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
    return function ProtectedRoute(props: P) {
        const { isAuthenticated, isLoading } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                router.push('/login');
            }
        }, [isLoading, isAuthenticated, router]);

        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            );
        }

        if (!isAuthenticated) {
            return null;
        }

        return <Component {...props} />;
    };
}
