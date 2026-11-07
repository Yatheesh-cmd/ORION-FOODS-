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
      try {
        console.log("[OneSignal] AuthContext: fetching /push/me ...");
        const { data } = await API.get("/push/me");
        console.log("[OneSignal] externalId from backend:", data?.externalId);
        if (!cancelled && data?.externalId) {
          await enableOneSignalForUser(data.externalId);
        }
      } catch (err) {
        // push is optional: never block the app, but show why it failed
        console.warn(
          "[OneSignal] /push/me failed:",
          err?.response?.status,
          err?.response?.data?.message || err?.message
        );
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