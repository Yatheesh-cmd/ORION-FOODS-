import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";
import { enableOneSignalForUser, disableOneSignalForUser } from "../services/oneSignal";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  // Link this device to the logged-in customer for push notifications.
  // Runs after login, register and on every page reload while logged in.
  useEffect(() => {
    if (!user || user.role !== "customer") return;

    let cancelled = false;
    (async () => {
      let externalId = null;

      try {
        const { data } = await API.get("/push/me");
        externalId = data?.externalId || null;
      } catch (err) {
        // /push/me not available (for example not deployed yet): fall back to the logged-in user's id
        console.warn(
          "[OneSignal] /push/me failed:",
          err?.response?.status,
          err?.response?.data?.message || err?.message
        );
      }

      if (!externalId) externalId = user?._id || user?.id || null;

      console.log("[OneSignal] externalId used:", externalId);
      if (!cancelled && externalId) {
        await enableOneSignalForUser(externalId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const login = async (email, password) => {
    const { data } = await API.post("/auth/login", { email, password });
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await API.post("/auth/google", { credential });
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await API.post("/auth/register", payload);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    disableOneSignalForUser();
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
