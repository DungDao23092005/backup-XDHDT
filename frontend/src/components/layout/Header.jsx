import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const roles = Array.isArray(user?.roles) ? user.roles.map(r => String(r).toUpperCase()) : [];
  const isAdmin = roles.includes(ROLES.ADMIN);
  const isChair = roles.includes(ROLES.CHAIR);
  const isReviewer = roles.includes(ROLES.REVIEWER);
  const isAuthor = roles.includes(ROLES.AUTHOR);

  const goDashboardByRole = () => {
    if (isAdmin) return navigate("/admin");
    if (isChair) return navigate("/chair");
    if (isReviewer) return navigate("/reviewer");
    if (isAuthor) return navigate("/author");
    return navigate("/");
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <button
        onClick={() => navigate("/")}
        className="font-black text-slate-900 hover:opacity-80"
      >
        UTH-ConfMS
      </button>

      <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
        <button onClick={() => navigate("/")} className="hover:text-rose-600">
          Trang chủ
        </button>

        {!!user && (
          <button onClick={goDashboardByRole} className="hover:text-rose-600">
            Dashboard
          </button>
        )}

        {!!user && (
          <span className="hidden sm:inline text-slate-500">
            Xin chào: <b className="text-slate-800">{user?.full_name || user?.sub || "User"}</b>
          </span>
        )}

        {!!user ? (
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
          >
            Đăng xuất
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate("/login")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
            >
              Đăng ký
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
