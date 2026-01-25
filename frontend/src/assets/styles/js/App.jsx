import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AuthorDashboard from './pages/AuthorDashboard';     
import ReviewerDashboard from './pages/ReviewerDashboard'; 
import ChairDashboard from './pages/ChairDashboard';       
import 'bootstrap/dist/css/bootstrap.min.css';

// Component bảo vệ: Nếu chưa có token thì đá về trang Login ngay lập tức
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('access_token');
    return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn mặc định: Tự động chuyển hướng về Login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Public Routes (Ai cũng vào được) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* --- CÁC TRANG DASHBOARD THEO ROLE (Được bảo vệ) --- */}
        
        {/* 1. Trang Admin */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        {/* 2. Trang Chair (Chủ tọa) */}
        <Route 
          path="/chair" 
          element={
            <PrivateRoute>
              <ChairDashboard />
            </PrivateRoute>
          } 
        />

        {/* 3. Trang Reviewer (Phản biện) */}
        <Route 
          path="/reviewer" 
          element={
            <PrivateRoute>
              <ReviewerDashboard />
            </PrivateRoute>
          } 
        />

        {/* 4. Trang Author (Tác giả) */}
        <Route 
          path="/author" 
          element={
            <PrivateRoute>
              <AuthorDashboard />
            </PrivateRoute>
          } 
        />

        {/* Xử lý đường dẫn lạ: Chuyển về Login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;