import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/settings');
      setSettings(data);
      if (data?.tuitionName) document.title = data.tuitionName;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadSettings();
    const token = localStorage.getItem('bmt_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem('bmt_token'))
      .finally(() => setLoading(false));
  }, [loadSettings]);

  const login = async (identifier, password, role) => {
    const { data } = await api.post('/auth/login', { identifier, password, role });
    localStorage.setItem('bmt_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('bmt_token');
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout, loading, settings, reloadSettings: loadSettings }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
