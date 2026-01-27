// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import { ROLES } from "../utils/constants";

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout"; 
// import AdminLayout from "../layouts/AdminLayout"; // ❌ BỎ file này nếu không dùng nữa

// Public Pages
import HomePage from "../pages/public/HomePage";
import ConferenceDetail from "../pages/public/ConferenceDetail";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

// Dashboard Pages (Author, Chair, Reviewer...)
import AuthorDashboard from "../pages/author/AuthorDashboard";
import MySubmissions from "../pages/author/MySubmissions";
import SubmitPaper from "../pages/author/SubmitPaper";
import PaperDetail from "../pages/author/PaperDetail";
import AddCoAuthor from "../pages/author/AddCoAuthor";
import EditPaper from "../pages/author/EditPaper";
import EditSubmissionAuthor from "../pages/author/EditSubmissionAuthor";
import Notifications from "../pages/author/Notifications";

import ChairDashboard from "../pages/chair/ChairDashboard";

// Reviewer Pages
import ReviewerDashboard from "../pages/reviewer/ReviewerDashboard";
import MyAssignments from "../pages/reviewer/MyAssignments";
import AssignmentDetail from "../pages/reviewer/AssignmentDetail";
import MyCOI from "../pages/reviewer/MyCOI";
import COINew from "../pages/reviewer/COINew";
import ReviewWorkspace from "../pages/reviewer/ReviewWorkspace";
import ReviewDiscussion from "../pages/reviewer/ReviewDiscussion";
import PaperBidding from "../pages/reviewer/PaperBidding";

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

      {/* 2) DASHBOARD CHUNG CHO TẤT CẢ ROLE (BAO GỒM ADMIN) */}
      <Route element={<DashboardLayout />}>
        
        {/* AUTHOR */}
        <Route element={<PrivateRoute allowedRoles={[ROLES.AUTHOR]} />}>
          <Route path="/author" element={<AuthorDashboard />} />
          <Route path="/author/submissions" element={<MySubmissions />} />
          <Route path="/author/submissions/new" element={<SubmitPaper />} />
          <Route path="/author/notifications" element={<Notifications />} />
          <Route path="/author/submissions/:id" element={<PaperDetail />} />
          <Route path="/author/submissions/:id/authors/new" element={<AddCoAuthor />} />
          <Route path="/author/submissions/:id/edit" element={<EditPaper />} />
          <Route path="/author/submissions/:id/authors/:authorId/edit" element={<EditSubmissionAuthor />} />
          <Route path="/author/submit" element={<Navigate to="/author/submissions/new" replace />} />
        </Route>

        {/* CHAIR */}
        <Route element={<PrivateRoute allowedRoles={[ROLES.CHAIR]} />}>
          <Route path="/chair" element={<ChairDashboard />} />
        </Route>

        {/* REVIEWER */}
        <Route path="/reviewer" element={<PrivateRoute allowedRoles={[ROLES.REVIEWER, ROLES.ADMIN]} />}>
          <Route index element={<ReviewerDashboard />} />
          <Route path="assignments" element={<MyAssignments />} />
          <Route path="assignments/:assignmentId" element={<AssignmentDetail />} />
          <Route path="coi" element={<MyCOI />} />
          <Route path="coi/new" element={<COINew />} />
          <Route path="bidding" element={<PaperBidding />} />
          <Route path="review/:assignmentId" element={<ReviewWorkspace />} />
          <Route path="discussion/:paperId" element={<ReviewDiscussion />} />
        </Route>

        {/* ADMIN (Đưa vào trong DashboardLayout) */}
        <Route path="/admin" element={<PrivateRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="users" element={<AdminDashboard />} />
            
            {/* Các trang giữ chỗ */}
            <Route path="conferences" element={<div className="p-10 font-bold text-gray-500">Quản lý Hội nghị (Đang phát triển)</div>} />
            <Route path="settings" element={<div className="p-10 font-bold text-gray-500">Cấu hình hệ thống (Đang phát triển)</div>} />
            <Route path="audit" element={<div className="p-10 font-bold text-gray-500">Nhật ký hệ thống (Đang phát triển)</div>} />
        </Route>

      </Route> 

      {/* 404 */}
      <Route path="*" element={
          <div className="text-center mt-5" style={{ padding: "50px" }}>
            <h1>404 - Không tìm thấy trang</h1>
            <a href="/" className="btn btn-primary">Về trang chủ</a>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;