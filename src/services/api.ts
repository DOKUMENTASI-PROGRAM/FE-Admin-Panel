import axios from 'axios';
import { supabase } from '@/lib/supabase';

const api = axios.create({
  baseURL: 'https://api.shemamusic.my.id',
});

// Request Interceptor - Add token to headers
api.interceptors.request.use(async (config) => {
  // Always try to get the latest session from Supabase
  // This handles auto-refresh if the token is about to expire
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Fallback to local storage if needed, or let it fail if no token
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      config.headers.Authorization = `Bearer ${storedToken}`;
    }
  }
  
  return config;
});

// Response Interceptor - Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the session using Supabase
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !data.session) {
          throw new Error('Session expired');
        }

        const token = data.session.access_token;
        
        // Update local storage (optional as AuthService listener also does this, but good for immediate retry)
        localStorage.setItem('token', token);
        
        // Update header and retry request
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
        
      } catch (err) {
        // Refresh failed, logout user
        await supabase.auth.signOut();
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
