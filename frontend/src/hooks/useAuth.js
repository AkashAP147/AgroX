import { useState, useCallback } from 'react';

export default function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mandi_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('mandi_user');
      return null;
    }
  });

  const loginUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('mandi_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mandi_user');
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...(prev || {}), ...updates };
      localStorage.setItem('mandi_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return { user, loginUser, logout, updateUser };
}
