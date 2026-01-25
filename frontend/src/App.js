// src/App.js
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import CSS cho thông báo đẹp

// Import các thành phần chúng ta đã xây dựng ở các bước trước
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    // 1. Bọc AuthProvider ngoài cùng để toàn bộ App đều biết ai đang đăng nhập
    <AuthProvider>
      
      {/* 2. Bọc BrowserRouter để dùng được Link, useNavigate */}
      <BrowserRouter>
        
        {/* 3. Nơi chứa logic chuyển trang */}
        <AppRoutes />
        
        {/* 4. Nơi hiển thị thông báo (Popup góc màn hình) */}
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;