import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt silent re-auth via the httpOnly refresh cookie.
    api.restoreSession()
      .then((restoredUser) => {
        if (restoredUser) setUser(restoredUser);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(username, password) {
      const res = await api.login({ username, password });
      setUser(res.user);
    },
    async register(payload) {
      await api.register(payload);
    },
    async logout() {
      try {
        await api.logout();
      } catch (err) {
        // Ignore API logout error and clear local state anyway.
      }
      setUser(null);
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}