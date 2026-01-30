import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../../layouts/AuthLayout";
import authApi from "../../api/authApi";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, token } = location.state || {};
  
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !token) navigate("/forgot-password");
  }, [email, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.warning("Mật khẩu không khớp!");
    
    setLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: password });
      toast.success("Đổi mật khẩu thành công! Hãy đăng nhập lại.");
      navigate("/login");
    } catch (error) {
      toast.error("Lỗi đổi mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle="Thiết lập mật khẩu mới để tiếp tục." imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDmZ24btV8ZD0rYgTcR4h9ud1VNlx12fNZgqJ5dpTTEYhA2WVv7PSX9qGpY-HBVp2wJAZlSJ1eU0iwvSbGwJuPLYA3vMAy_mFc82GJgadO0P8nVz9cVNk_bsDlATsl1LLagNuaKnzRBiaT28XikYhbD-E5fyGGiu2PUuQLiJ07daWuIfJKTLZXiSPcWkFCIN0KPSBufBSuubyXgXOPGZq8K3WH5_cEKlYUnG9Fb-sQ92VOO_WIiXRiZBTLltdddDYhpQt0XBx_JYJ-9">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mật khẩu mới</h2>
        <p className="text-sm text-gray-500">Vui lòng nhập mật khẩu mới cho tài khoản.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Mật khẩu mới</label>
          <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)}
            className="w-full mt-1 p-3 rounded-lg border border-gray-300 dark:bg-gray-800" placeholder="Mật khẩu mới" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Xác nhận mật khẩu</label>
          <input type="password" required value={confirm} onChange={(e)=>setConfirm(e.target.value)}
            className="w-full mt-1 p-3 rounded-lg border border-gray-300 dark:bg-gray-800" placeholder="Nhập lại mật khẩu" />
        </div>

        <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-700">
          {loading ? "Đang xử lý..." : "Hoàn tất"}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm font-bold text-primary hover:underline">Quay lại đăng nhập</Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;