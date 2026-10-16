import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem('propr_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (nextUser, token = null) => {
    setUser(nextUser);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('propr_user', JSON.stringify(nextUser));
      if (token) localStorage.setItem('propr_token', token);
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('propr_user');
      localStorage.removeItem('propr_token');
    }
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
