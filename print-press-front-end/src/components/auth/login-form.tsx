'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { passwordService } from '@/lib/passwordService';
import { Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login...', {
        identifier: formData.identifier,
      });

      // Use unified login endpoint
      const response = await api.post('/auth/login', {
        identifier: formData.identifier,
        password: formData.password,
      });

      console.log('✅ Login successful:', response.data);

      const accessToken = response.data.accessToken || response.data.token;
      const refreshToken = response.data.refreshToken;
      const user = response.data.user;

      if (!accessToken) {
        throw new Error('No access token received from server');
      }

      if (!user) {
        throw new Error('No user data received from server');
      }

      localStorage.setItem('auth_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(user));

      // Clear PWA dismiss flag on fresh login (ensures banner shows after logout/login)
      sessionStorage.removeItem('pwa_install_dismissed');

      console.log('💾 Tokens stored successfully:', {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        userRole: user.role,
      });

      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');

      console.log('🔍 Storage verification:', {
        tokenStored: !!storedToken,
        userStored: !!storedUser,
        userRole: storedUser ? JSON.parse(storedUser).role : 'none',
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
        const axiosError = error as {
          response?: { data?: { error?: string } };
        };
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

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryMessage('');

    if (!recoveryIdentifier.trim()) {
      setRecoveryMessage(
        'Please provide the email or username for the account.'
      );
      return;
    }

    setRecoveryLoading(true);
    try {
      const response = await passwordService.requestResetLink({
        identifier: recoveryIdentifier.trim(),
      });
      setRecoveryMessage(
        response.message || 'Password reset link sent successfully.'
      );
      setRecoveryIdentifier('');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setRecoveryMessage(
          axiosError.response?.data?.error || 'Failed to send reset link.'
        );
      } else if (err instanceof Error) {
        setRecoveryMessage(err.message);
      } else {
        setRecoveryMessage('Failed to send reset link.');
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto ">
      {/* LOGO PLACED ABOVE THE CARD */}
      <div className="flex justify-center mb-8">
        {/* <div className="relative w-32 h-32">
          <Image
            src="/logo.png"
            alt="Company Logo"
            fill
            className="object-contain"
            priority
          />
        </div> */}
      </div>

      {/* LOGIN FORM CARD */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-gray-700"
            >
              Email or Username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              value={formData.identifier}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email or username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* LIGHT GREEN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            onClick={() => {
              setShowRecovery((prev) => !prev);
              setRecoveryMessage('');
            }}
          >
            Forgot password?
          </button>

          {showRecovery && (
            <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="recoveryIdentifier"
                  className="block text-sm font-medium text-gray-700"
                >
                  Enter your email or username
                </label>
                <input
                  id="recoveryIdentifier"
                  name="recoveryIdentifier"
                  type="text"
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>
              <div className="flex gap-2">
                {/* LIGHT GREEN BUTTON */}
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recoveryLoading ? 'Sending...' : 'Send reset link'}
                </button>
                {recoveryMessage && (
                  <button
                    type="button"
                    onClick={handleRecoverySubmit}
                    disabled={recoveryLoading}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend
                  </button>
                )}
              </div>
              {recoveryMessage && (
                <p className="text-sm text-gray-600">{recoveryMessage}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
