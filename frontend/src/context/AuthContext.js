import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import authApi from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.href = "/login";
  }, []);

  const handleToken = useCallback((token) => {
    if (!token) {
        setUser(null);
        return;
    }
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        throw new Error("Token expired");
      }

      const normalizedUser = {
        ...decoded,
        id: decoded.id ?? decoded.user_id ?? decoded.sub, 
        full_name: decoded.full_name ?? decoded.name ?? decoded.email,
        roles: Array.isArray(decoded.roles)
          ? decoded.roles.map((r) => String(r).toUpperCase())
          : [],
      };

      setUser(normalizedUser);
      localStorage.setItem("access_token", token);
    } catch (e) {
      console.error("Lỗi xử lý token:", e);
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        handleToken(token);
      }
      setLoading(false);
    };

    initAuth();
  }, [handleToken]);

  const login = async (email, password) => {
    try {
      const res = await authApi.login({ email, password });
      const access_token = res?.data?.access_token || res?.access_token;

      if (!access_token) {
        throw new Error("Không nhận được access_token từ server");
      }

      handleToken(access_token);
      
      if (res?.data?.refresh_token) {
          localStorage.setItem("refresh_token", res.data.refresh_token);
      }
      
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {/* Chỉ render children khi đã load xong thông tin User */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);