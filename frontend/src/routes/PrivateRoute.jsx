import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ allowedRoles = [] }) => {
  const { user } = useAuth(); 
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = user.roles || []; 
  const requiredRoles = allowedRoles.map((r) => String(r).toUpperCase());

  if (requiredRoles.length > 0) {
    const hasPermission = userRoles.some((role) => requiredRoles.includes(role));
    
    if (!hasPermission) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="p-8 text-center bg-white rounded-lg shadow-xl border border-red-100 max-w-md">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <i className="bi bi-shield-lock-fill text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Truy cập bị từ chối</h3>
            <p className="text-gray-500 mb-6">
                Tài khoản <strong>{user.email}</strong> (Role: {userRoles.join(", ")}) không có quyền truy cập trang này.
            </p>
            <button 
                onClick={() => window.history.back()}
                className="btn btn-outline-danger btn-sm"
            >
                Quay lại
            </button>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
};

export default PrivateRoute;