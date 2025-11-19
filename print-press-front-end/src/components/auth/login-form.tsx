'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface LoginFormProps {
  isAdmin?: boolean;
}

export function LoginForm({ isAdmin = false }: LoginFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login...', { isAdmin, identifier: formData.identifier });

      const endpoint = isAdmin ? '/auth/admin/login' : '/auth/login';
      
      const response = await api.post(endpoint, {
        identifier: formData.identifier,
        password: formData.password,
      });

      console.log('✅ Login successful:', response.data);

      // Extract tokens - handle both response formats
      const accessToken = response.data.accessToken || response.data.token;
      const refreshToken = response.data.refreshToken;
      const user = response.data.user;

      if (!accessToken) {
        throw new Error('No access token received from server');
      }

      if (!user) {
        throw new Error('No user data received from server');
      }

      // Store tokens and user data
      localStorage.setItem('auth_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(user));

      console.log('💾 Tokens stored successfully:', {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        userRole: user.role
      });

      // Verify the token is stored correctly
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      
      console.log('🔍 Storage verification:', {
        tokenStored: !!storedToken,
        userStored: !!storedUser,
        userRole: storedUser ? JSON.parse(storedUser).role : 'none'
      });

      // Redirect based on user role
      if (user.role === 'admin') {
        console.log('🔄 Redirecting to admin dashboard...');
        router.push('/admin/dashboard');
      } else {
        console.log('🔄 Redirecting to worker dashboard...');
        router.push('/worker/dashboard');
      }

    } catch (error: unknown) {
      console.error('❌ Login error:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          setError(axiosError.response.data.error);
        } else {
          setError('Login failed. Please check your credentials.');
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isAdmin ? 'Admin Login' : 'User Login'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
            {isAdmin ? 'Email or Username' : 'Email or Username'}
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            value={formData.identifier}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={isAdmin ? "Enter admin email or username" : "Enter your email or username"}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}