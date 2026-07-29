import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'eniso_token';
const USER_KEY = 'eniso_user';

function readCachedUser() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    // Si déjà une session en cache, pas besoin de bloquer l'UI
    return !!token && !readCachedUser();
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      clearSession();
      setUser(null);
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => {
        const { token: freshToken, ...profile } = res.data;
        const nextUser = {
          id: profile.id,
          nom: profile.nom,
          email: profile.email,
          role: profile.role,
          ...(profile.filiere !== undefined ? { filiere: profile.filiere } : {}),
        };
        persistSession(freshToken || token, nextUser);
        setUser(nextUser);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persistSession(data.token, data.user);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member' || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        admin: isAdmin ? user : null,
        loading,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        isMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
