// src/routes/PrivateRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated, getUserRole } from "../utils/auth";

const PrivateRoute = ({ allowedRoles = [] }) => {
  const isAuth = isAuthenticated();
  const userRole = getUserRole();

  // Chưa đăng nhập -> đá về login
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  const normalizedUserRole = (userRole || "").toUpperCase();
  const normalizedAllowed = (allowedRoles || []).map((r) =>
    (r || "").toUpperCase()
  );

  // Có allowedRoles mà role hiện tại không nằm trong danh sách -> chặn
  if (
    normalizedAllowed.length > 0 &&
    !normalizedAllowed.includes(normalizedUserRole)
  ) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#9f1239",
            padding: 16,
            borderRadius: 12,
            fontWeight: 700,
          }}
        >
          Bạn không có quyền truy cập trang này!
        </div>
      </div>
    );
  }

  // OK -> render route con
  return <Outlet />;
};

export default PrivateRoute;
