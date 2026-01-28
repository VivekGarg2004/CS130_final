'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const searchParams = useSearchParams();
    const justRegistered = searchParams.get('registered') === 'true';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full">
            {/* Logo/Brand */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">StratForge</h1>
                <p className="text-gray-400 mt-2">Sign in to your account</p>
            </div>

            {/* Success message */}
            {justRegistered && (
                <div className="mb-6 p-4 bg-emerald-900/50 border border-emerald-500 rounded-lg">
                    <p className="text-emerald-400 text-sm text-center">
                        Account created successfully! Please sign in.
                    </p>
                </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-8 shadow-xl">
                {error && (
                    <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-6 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center"
                >
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                        'Sign In'
                    )}
                </button>

                <p className="mt-6 text-center text-gray-400 text-sm">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                        Create one
                    </Link>
                </p>
            </form>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <Suspense fallback={
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            }>
                <LoginForm />
            </Suspense>
        </div>
    );
}
