const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  user_name?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  message: string;
}

export interface LegacyAuthResponse {
  token: string;
  user: User;
  message: string;
}

export type LoginResponse = AuthResponse | LegacyAuthResponse;

export interface ApiError {
  error: string;
  message?: string;
}

export const refreshAuthToken = async (): Promise<AuthResponse | null> => {
  try {
    console.log('🔄 Attempting token refresh...');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      console.log('❌ No refresh token available');
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data: AuthResponse = await response.json();
      console.log('✅ Token refresh successful');
      
      // Store new tokens
      localStorage.setItem('auth_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } else {
      const errorData: ApiError = await response.json();
      console.error('❌ Token refresh failed:', errorData.error);
      // Refresh token is also expired, logout user
      logout();
      return null;
    }
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    logout();
    return null;
  }
};

export const getValidToken = async (): Promise<string | null> => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('❌ No access token found');
      return null;
    }

    // Check if token is expired
    const isExpired = isTokenExpired(token);
    
    if (isExpired) {
      console.log('🔄 Access token expired, refreshing...');
      const newAuth = await refreshAuthToken();
      return newAuth ? newAuth.accessToken : null;
    }
    
    console.log('✅ Access token is valid');
    return token;
  } catch (error) {
    console.error('❌ Token validation failed:', error);
    const newAuth = await refreshAuthToken();
    return newAuth ? newAuth.accessToken : null;
  }
};

export const logout = (): void => {
  console.log('🚪 Performing logout...');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  // Redirect to login page
  if (typeof window !== 'undefined') {
    console.log('🔄 Redirecting to login page...');
    window.location.href = '/adm/login';
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    // Check if it's a JWT token (has 3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('🔍 Token is not a JWT, assuming valid');
      return false; // Not a JWT, assume it's valid
    }

    const payload = JSON.parse(atob(parts[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    const isExpired = expirationTime - bufferTime <= currentTime;
    console.log('🔍 JWT expiration check:', {
      expirationTime: new Date(expirationTime).toISOString(),
      currentTime: new Date(currentTime).toISOString(),
      isExpired
    });
    
    return isExpired;
  } catch (error) {
    console.error('❌ Error checking token expiration:', error);
    return false; // If we can't parse it, assume it's valid to prevent immediate logout
  }
};

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    console.log('🔍 Retrieved stored user:', user?.name);
    return user;
  } catch (error) {
    console.error('❌ Error getting stored user:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('auth_token');
  const user = getStoredUser();
  
  console.log('🔍 Authentication check:', {
    hasToken: !!token,
    hasUser: !!user,
    userRole: user?.role
  });

  if (!token || !user) return false;
  
  // Check if token is expired
  return !isTokenExpired(token);
};