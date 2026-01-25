import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

const PublicNavbar = () => {
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
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-black text-slate-900">
          UTH-ConfMS
        </Link>

        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Link to="/" className="hover:text-rose-600">Trang chủ</Link>

          {user ? (
            <>
              <button onClick={goDashboardByRole} className="hover:text-rose-600">
                Dashboard
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Đăng xuất
              </button>
            </>
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
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Đăng ký
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicNavbar;
