import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../../layouts/AuthLayout";
import authApi from "../../api/authApi";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) navigate("/forgot-password"); // Chặn truy cập trực tiếp
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return; // Chỉ cho nhập số
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Tự động nhảy sang ô tiếp theo
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Xóa thì lùi lại ô trước
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length < 6) return toast.warning("Vui lòng nhập đủ 6 số");

    setLoading(true);
    try {
      // Gọi API Verify OTP (cần thêm hàm này vào authApi.js)
      await authApi.verifyOtp({ email, otp: otpCode });
      
      // Thành công -> Sang trang đổi mật khẩu (kèm token là mã OTP)
      navigate("/auth/reset-password", { state: { email, token: otpCode } });
    } catch (error) {
      toast.error("Mã OTP không đúng hoặc đã hết hạn!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Khôi phục quyền truy cập" 
      subtitle="Bảo mật đa lớp bảo vệ tài khoản của bạn."
      imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDmZ24btV8ZD0rYgTcR4h9ud1VNlx12fNZgqJ5dpTTEYhA2WVv7PSX9qGpY-HBVp2wJAZlSJ1eU0iwvSbGwJuPLYA3vMAy_mFc82GJgadO0P8nVz9cVNk_bsDlATsl1LLagNuaKnzRBiaT28XikYhbD-E5fyGGiu2PUuQLiJ07daWuIfJKTLZXiSPcWkFCIN0KPSBufBSuubyXgXOPGZq8K3WH5_cEKlYUnG9Fb-sQ92VOO_WIiXRiZBTLltdddDYhpQt0XBx_JYJ-9"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <span className="material-symbols-outlined text-3xl">verified_user</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Xác nhận mã OTP</h2>
        <p className="text-sm text-gray-500 mt-2">Mã 6 chữ số đã gửi đến <b>{email}</b></p>
      </div>

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-between gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text" maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-gray-300 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
            />
          ))}
        </div>

        <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
          {loading ? "Đang xác thực..." : "Xác nhận mã"}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-gray-500 hover:text-primary">Quay lại đăng nhập</Link>
      </div>
    </AuthLayout>
  );
};

export default VerifyOtp;