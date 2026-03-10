import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ls_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem('ls_token') || null
  );

  const persistSession = (token, userData) => {
    setAccessToken(token);
    setUser(userData);
    localStorage.setItem('ls_token', token);
    localStorage.setItem('ls_user', JSON.stringify(userData));
  };

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
    persistSession(data.accessToken, data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (fullName, email, password, role = 'learner') => {
    const { data } = await axios.post('/api/auth/signup', { fullName, email, password, role }, { withCredentials: true });
    persistSession(data.accessToken, data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
      });
    } catch {
      // ignore errors on logout
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('ls_token');
    localStorage.removeItem('ls_user');
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
