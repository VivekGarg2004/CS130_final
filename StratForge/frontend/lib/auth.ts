const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface User {
    id: string;
    email: string;
    username: string | null;
}

export interface AuthResponse {
    message: string;
    token?: string;
    user: User;
}

// Token storage
export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('stratforge_token');
};

export const setToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('stratforge_token', token);
};

export const removeToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('stratforge_token');
};

// API calls
export const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Login failed');
    }

    if (data.token) {
        setToken(data.token);
    }

    return data;
};

export const register = async (
    email: string,
    password: string,
    username?: string
): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
    }

    return data;
};

export const logout = (): void => {
    removeToken();
};

export const getMe = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) return null;

    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            removeToken();
            return null;
        }

        const data = await res.json();
        return data.user;
    } catch {
        return null;
    }
};

// Helper for authenticated fetch
export const authFetch = async (
    url: string,
    options: RequestInit = {}
): Promise<Response> => {
    const token = getToken();

    return fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
};
