// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import { ROLES } from "../utils/constants";

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import AdminLayout from "../layouts/AdminLayout";

// Public Pages
import HomePage from "../pages/public/HomePage";
import ConferenceDetail from "../pages/public/ConferenceDetail";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

// Author Pages
import AuthorDashboard from "../pages/author/AuthorDashboard";
import MySubmissions from "../pages/author/MySubmissions";
import SubmitPaper from "../pages/author/SubmitPaper";

// Chair Pages
import ChairDashboard from "../pages/chair/ChairDashboard";

// Reviewer Pages
import ReviewerDashboard from "../pages/reviewer/ReviewerDashboard";
import MyAssignments from "../pages/reviewer/MyAssignments";
import AssignmentDetail from "../pages/reviewer/AssignmentDetail";
import MyCOI from "../pages/reviewer/MyCOI";
import COINew from "../pages/reviewer/COINew";
import ReviewWorkspace from "../pages/reviewer/ReviewWorkspace";
import ReviewDiscussion from "../pages/reviewer/ReviewDiscussion";
import PaperBidding from "../pages/reviewer/PaperBidding"; // Đã import

// Admin Pages
import AdminDashboard from "../pages/admin/AdminDashboard"; 
import DashboardOverview from "../pages/admin/DashboardOverview"; 

const AppRoutes = () => {
  return (
    <Routes>
      {/* 1) PUBLIC ROUTES */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/conference/:id" element={<ConferenceDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* 2) GENERAL DASHBOARD (Author, Chair, Reviewer) */}
      <Route element={<DashboardLayout />}>
        {/* AUTHOR */}
        <Route element={<PrivateRoute allowedRoles={[ROLES.AUTHOR]} />}>
          <Route path="/author" element={<AuthorDashboard />} />
          <Route path="/author/submissions" element={<MySubmissions />} />
          <Route path="/author/submissions/new" element={<SubmitPaper />} />
          <Route
            path="/author/submit"
            element={<Navigate to="/author/submissions/new" replace />}
          />
        </Route>

        {/* CHAIR */}
        <Route element={<PrivateRoute allowedRoles={[ROLES.CHAIR]} />}>
          <Route path="/chair" element={<ChairDashboard />} />
        </Route>

        {/* REVIEWER (Reviewer + Admin) - NESTED */}
        <Route
          path="/reviewer"
          element={<PrivateRoute allowedRoles={[ROLES.REVIEWER, ROLES.ADMIN]} />}
        >
          {/* /reviewer */}
          <Route index element={<ReviewerDashboard />} />

          {/* /reviewer/assignments */}
          <Route path="assignments" element={<MyAssignments />} />

          {/* /reviewer/assignments/:assignmentId */}
          <Route path="assignments/:assignmentId" element={<AssignmentDetail />} />

          {/* /reviewer/coi */}
          <Route path="coi" element={<MyCOI />} />

          {/* /reviewer/coi/new */}
          <Route path="coi/new" element={<COINew />} />

          {/* /reviewer/bidding - ROUTE MỚI THÊM VÀO */}
          <Route path="bidding" element={<PaperBidding />} />

          {/* /reviewer/review/:assignmentId */}
          <Route path="review/:assignmentId" element={<ReviewWorkspace />} />

          {/* /reviewer/discussion/:paperId */}
          <Route path="discussion/:paperId" element={<ReviewDiscussion />} />
        </Route>
      </Route>

      {/* 3) ADMIN DASHBOARD (New Layout) */}
      <Route element={<PrivateRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="users" element={<AdminDashboard />} />

          {/* Placeholder */}
          <Route
            path="conferences"
            element={
              <div className="p-10 font-bold text-gray-500">
                Quản lý Hội nghị (Đang phát triển)
              </div>
            }
          />
          <Route
            path="settings"
            element={
              <div className="p-10 font-bold text-gray-500">
                Cấu hình hệ thống (Đang phát triển)
              </div>
            }
          />
          <Route
            path="audit"
            element={
              <div className="p-10 font-bold text-gray-500">
                Nhật ký hệ thống (Đang phát triển)
              </div>
            }
          />
        </Route>
      </Route>

      {/* 4) 404 */}
      <Route
        path="*"
        element={
          <div className="text-center mt-5" style={{ padding: "50px" }}>
            <h1>404 - Không tìm thấy trang</h1>
            <p>Đường dẫn bạn truy cập không tồn tại.</p>
            <a href="/" className="btn btn-primary">
              Về trang chủ
            </a>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;