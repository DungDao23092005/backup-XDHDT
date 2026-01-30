import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../../layouts/AuthLayout";
import authApi from "../../api/authApi";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      // Chuyển sang trang nhập OTP, mang theo email
      navigate("/auth/verify-otp", { state: { email } });
      toast.success("Mã xác nhận đã gửi đến email!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Lỗi gửi yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Khôi phục quyền truy cập"
      subtitle="Hệ thống luôn sẵn sàng hỗ trợ bạn tiếp tục hành trình nghiên cứu."
      imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDmZ24btV8ZD0rYgTcR4h9ud1VNlx12fNZgqJ5dpTTEYhA2WVv7PSX9qGpY-HBVp2wJAZlSJ1eU0iwvSbGwJuPLYA3vMAy_mFc82GJgadO0P8nVz9cVNk_bsDlATsl1LLagNuaKnzRBiaT28XikYhbD-E5fyGGiu2PUuQLiJ07daWuIfJKTLZXiSPcWkFCIN0KPSBufBSuubyXgXOPGZq8K3WH5_cEKlYUnG9Fb-sQ92VOO_WIiXRiZBTLltdddDYhpQt0XBx_JYJ-9" // Ảnh tòa nhà khác
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Quên mật khẩu?</h2>
        <p className="text-gray-500 text-sm">Nhập email đã đăng ký để nhận mã xác nhận.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Email đăng ký</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">mail</span>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="pl-10 block w-full rounded-lg border-0 py-3 ring-1 ring-inset ring-gray-300 dark:bg-gray-800 dark:text-white"
              placeholder="username@example.com"
            />
          </div>
        </div>
        <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
          {loading ? "Đang gửi..." : "Gửi mã xác nhận"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-lg">arrow_back</span> Quay lại đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;