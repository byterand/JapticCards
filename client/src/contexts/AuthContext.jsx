import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
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

  // Each method is memoized so its identity stays stable across renders
  // (consumers won't re-fire effects keyed on these references).
  const login = useCallback(async (username, password) => {
    const res = await api.login({ username, password });
    setUser(res.user);
  }, []);

  const register = useCallback(async (payload) => {
    await api.register(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      // Ignore API logout error and clear local state anyway.
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}