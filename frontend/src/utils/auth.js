import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = 'access_token';

export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};
export const setToken = (token) => {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
};

export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};

export const getUserRole = () => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    let rawRoles = decoded.roles ?? decoded.role ?? decoded.authorities ?? null;

    if (!rawRoles) return null;

    let roleNames = [];

    if (Array.isArray(rawRoles)) {
      roleNames = rawRoles.map((r) => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object') return r.role_name || r.name || r.role || '';
        return '';
      });
    } else if (typeof rawRoles === 'string') {
      roleNames = [rawRoles];
    } else if (rawRoles && typeof rawRoles === 'object') {
      roleNames = [rawRoles.role_name || rawRoles.name || rawRoles.role || ''];
    }

    const normalized = roleNames
      .filter(Boolean)
      .map((r) => r.toString().toUpperCase());

    if (normalized.includes('ADMIN')) return 'ADMIN';
    if (normalized.includes('CHAIR')) return 'CHAIR';
    if (normalized.includes('REVIEWER')) return 'REVIEWER';
    if (normalized.includes('AUTHOR')) return 'AUTHOR';

    return normalized[0] || null;

  } catch (error) {
    console.error("Lỗi giải mã token:", error);
    return null;
  }
};


export const getUserInfo = () => {
    const token = getToken();
    if (!token) return null;
    try {
        return jwtDecode(token);
    } catch (error) {
        return null;
    }
};

export const isAuthenticated = () => {
    const token = getToken();
    if (!token) return false;

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
            removeToken();
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
};

export const logout = () => {
    removeToken();
};