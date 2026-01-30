// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import { ROLES } from "../utils/constants";
import AccountSettings from "../pages/common/AccountSettings";


// Layouts
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout"; 

// Public Pages
import HomePage from "../pages/public/HomePage";
import ConferenceDetail from "../pages/public/ConferenceDetail";

// Auth Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword"; 
import VerifyOtp from "../pages/auth/VerifyOtp"; 
import ResetPassword from "../pages/auth/ResetPassword";

// Dashboard Pages (Author, Chair, Reviewer...)
import AuthorDashboard from "../pages/author/AuthorDashboard";
import MySubmissions from "../pages/author/MySubmissions";
import SubmitPaper from "../pages/author/SubmitPaper";
import PaperDetail from "../pages/author/PaperDetail";
import AddCoAuthor from "../pages/author/AddCoAuthor";
import EditPaper from "../pages/author/EditPaper";
import EditSubmissionAuthor from "../pages/author/EditSubmissionAuthor";
import Notifications from "../pages/author/Notifications";
import DiscoverConferences from "../pages/author/DiscoverConferences";
import AuthorConferenceDetail from "../pages/author/AuthorConferenceDetail";

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
import ReviewerNotifications from "../pages/reviewer/ReviewerNotifications";

// Admin Pages
import AdminDashboard from "../pages/admin/AdminDashboard";
import DashboardOverview from "../pages/admin/DashboardOverview";

// Common Pages
import ProfilePage from "../pages/common/ProfilePage"; // ✅ THÊM MỚI: Trang hồ sơ dùng chung

//Chair page 
import ConferenceListPage from "../pages/chair/conference/ConferenceListPage";
import CreateConferencePage from "../pages/chair/conference/CreateConferencePage";
import CreateTrackPage from "../pages/chair/tracks/CreateTrackPage";
import ConferenceDetailPage from "../pages/chair/conference/ConferenceDetailPage";
import ConferenceEditPage from "../pages/chair/conference/ConferenceEditPage";
import TrackEditPage from "../pages/chair/tracks/TrackEditPage";
import ReviewerManagementPage from "../pages/chair/ReviewerManagementPage";

const AppRoutes = () => {
  return (
    <Routes>
      {/* 1) PUBLIC ROUTES (Có Header/Footer chung của web) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/conference/:id" element={<ConferenceDetail />} />
      </Route>

      {/* 2) AUTH ROUTES (Login/Register/Forgot Pass)
          ⚠️ Đưa ra ngoài PublicLayout để tránh bị Double Header 
          (Vì AuthLayout đã tự bao gồm Header/Footer riêng rồi)
      */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Quy trình Quên mật khẩu 3 bước */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/verify-otp" element={<VerifyOtp />} />       
      <Route path="/auth/reset-password" element={<ResetPassword />} /> 


      {/* 3) DASHBOARD CHUNG CHO TẤT CẢ ROLE (BAO GỒM ADMIN) */}
      <Route element={<DashboardLayout />}>

             
        {/* AUTHOR */}
        <Route element={<PrivateRoute allowedRoles={[ROLES.AUTHOR]} />}>
          <Route path="/author" element={<AuthorDashboard />} />
          <Route path="/author/settings" element={<AccountSettings />} />
          <Route path="/author/profile" element={<ProfilePage />} /> 
          <Route path="/author/submissions" element={<MySubmissions />} />
          <Route path="/author/submissions/new" element={<SubmitPaper />} />
          <Route path="/author/notifications" element={<Notifications />} />
          <Route path="/author/conferences" element={<DiscoverConferences />} />
          <Route path="/author/conferences/:id" element={<AuthorConferenceDetail />} />
          <Route path="/author/submissions/:id" element={<PaperDetail />} />
          <Route path="/author/submissions/:id/authors/new" element={<AddCoAuthor />} />
          <Route path="/author/submissions/:id/edit" element={<EditPaper />} />
          <Route path="/author/submissions/:id/authors/:authorId/edit" element={<EditSubmissionAuthor />} />
          <Route path="/author/submit" element={<Navigate to="/author/submissions/new" replace />} />
        </Route>

        {/* CHAIR */}
        <Route element={<PrivateRoute allowedRoles={[ROLES.CHAIR]} />}>
          <Route path="/chair" element={<ChairDashboard />} />
          
          <Route path="/chair/conferences" element={<ConferenceListPage />} />
          <Route path="/chair/conferences/create" element={<CreateConferencePage />}/>
          <Route path="/chair/tracks/create" element={<CreateTrackPage />} />
          <Route path="/chair/conferences/:id" element={<ConferenceDetailPage />} />
          <Route path="/chair/conferences/:id/edit" element={<ConferenceEditPage />} />
          <Route path="/chair/tracks/:id/edit" element={<TrackEditPage />} />
          <Route path="/chair/reviewers" element={<ReviewerManagementPage />} />
          <Route path="/chair/profile" element={<ProfilePage />} /> 
          <Route path="/chair/settings" element={<AccountSettings />} />

        </Route>

        {/* REVIEWER */}
        <Route path="/reviewer" element={<PrivateRoute allowedRoles={[ROLES.REVIEWER, ROLES.ADMIN]} />}>
          <Route index element={<ReviewerDashboard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="assignments" element={<MyAssignments />} />
          <Route path="notifications" element={<ReviewerNotifications />} />
          <Route path="settings" element={<AccountSettings />} />
          <Route path="assignments/:assignmentId" element={<AssignmentDetail />} />
          <Route path="coi" element={<MyCOI />} />
          <Route path="coi/new" element={<COINew />} />
          <Route path="bidding" element={<PaperBidding />} />
          <Route path="review/:assignmentId" element={<ReviewWorkspace />} />
          <Route path="discussion/:paperId" element={<ReviewDiscussion />} />
        </Route>

        {/* ADMIN */}
        <Route path="/admin" element={<PrivateRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="profile" element={<ProfilePage />} /> 
            <Route path="users" element={<AdminDashboard />} />
            <Route path="settings" element={<AccountSettings />} />
            
            <Route path="conferences" element={<ConferenceListPage/> } />
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