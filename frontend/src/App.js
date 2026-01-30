// src/App.js
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { UISettingsProvider } from "./context/UISettingsContext";
import 'react-toastify/dist/ReactToastify.css'; // Import CSS cho thông báo đẹp

// Import các thành phần chúng ta đã xây dựng ở các bước trước
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <AuthProvider>
      <UISettingsProvider>
        <BrowserRouter>
          <AppRoutes />
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
      </UISettingsProvider>
    </AuthProvider>
  );
}

export default App;