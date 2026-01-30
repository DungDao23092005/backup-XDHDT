import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { signInWithPopup } from "firebase/auth"; 

import { useAuth } from "../../context/AuthContext";
import { getUserRole } from "../../utils/auth";
import AuthLayout from "../../layouts/AuthLayout";
// [QUAN TRỌNG] Import thêm githubProvider từ file config
import { auth, googleProvider, githubProvider } from "../../config/firebase"; 
import authApi from "../../api/authApi"; 

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Hàm login thường (Email/Pass) từ Context

  const [formData, setFormData] = useState({
    email: "admin@uth.edu.vn",
    password: "123456",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Hàm chuyển hướng dùng cho đăng nhập thường (giữ nguyên)
  const redirectByRole = (role) => {
    let r = role;
    if (Array.isArray(role) && role.length > 0) {
      r = role[0];
    }
    r = (r || "").toString().toUpperCase();

    switch (r) {
      case "ADMIN":
        navigate("/admin", { replace: true });
        break;
      case "CHAIR":
        navigate("/chair", { replace: true });
        break;
      case "REVIEWER":
        navigate("/reviewer", { replace: true });
        break;
      case "AUTHOR":
      default:
        navigate("/author", { replace: true });
        break;
    }
  };

  // --- XỬ LÝ ĐĂNG NHẬP THƯỜNG (EMAIL/PASS) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.warning("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success("✅ Đăng nhập thành công!");

      const role = getUserRole();
      if (!role || (Array.isArray(role) && role.length === 0)) {
        navigate("/author", { replace: true });
        return;
      }
      redirectByRole(role);
    } catch (err) {
      console.error("Login error:", err);
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 401) {
        toast.error("Sai email hoặc mật khẩu!");
      } else if (status === 422) {
        const detail = data?.detail;
        toast.error(
          typeof detail === "string"
            ? `Dữ liệu không hợp lệ: ${detail}`
            : "Dữ liệu đăng nhập không hợp lệ (422)."
        );
      } else if (status) {
        toast.error(`Lỗi server (${status}). Vui lòng thử lại.`);
      } else {
        toast.error(err.message || "Không thể kết nối đến server.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM DÙNG CHUNG ĐỂ XỬ LÝ SAU KHI CÓ TOKEN TỪ FIREBASE ---
  const handleFirebaseLogin = async (providerName, providerObj) => {
    setLoading(true);
    try {
      // 1. Mở Popup đăng nhập (Google hoặc GitHub)
      const result = await signInWithPopup(auth, providerObj);
      const user = result.user;
      
      // 2. Lấy ID Token từ Firebase
      const idToken = await user.getIdToken();

      // 3. Gửi Token về Backend để đổi lấy Access Token của hệ thống
      // (Backend chấp nhận mọi token Firebase hợp lệ, không phân biệt Google/GitHub)
      const response = await authApi.loginWithFirebase(idToken);

      // 4. Lưu Token vào LocalStorage 
      if (response.access_token) {
        localStorage.setItem("access_token", response.access_token);
        if (response.refresh_token) {
          localStorage.setItem("refresh_token", response.refresh_token);
        }
      }

      toast.success(`✅ Đăng nhập ${providerName} thành công!`);

      // 5. [FIX LỖI] Dùng window.location để reload trang và chuyển hướng
      setTimeout(() => {
          const role = getUserRole();
          
          let targetUrl = "/author"; // Mặc định
          let r = role;
          if (Array.isArray(role) && role.length > 0) r = role[0];
          r = (r || "").toString().toUpperCase();

          if (r === "ADMIN") targetUrl = "/admin";
          else if (r === "CHAIR") targetUrl = "/chair";
          else if (r === "REVIEWER") targetUrl = "/reviewer";
          
          // Force reload trang web để reset state của AuthContext
          window.location.href = targetUrl;
      }, 1000);
      
    } catch (err) {
      console.error(`${providerName} Login Error:`, err);
      if (err.code === 'auth/popup-closed-by-user') {
          toast.info(`Đã hủy đăng nhập ${providerName}.`);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
          toast.error("Email này đã được sử dụng bởi phương thức đăng nhập khác.");
      } else if (err.response && err.response.status === 401) {
          toast.error("Lỗi xác thực (401). Vui lòng kiểm tra lại giờ hệ thống.");
      } else {
          toast.error(`Đăng nhập ${providerName} thất bại. Vui lòng thử lại.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Chào mừng trở lại"
      subtitle="Hệ thống quản lý hội nghị UTH đã đơn giản hóa quy trình nộp bài học thuật của chúng tôi."
      imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDAGcpns02FBknLcXNQqOGOswFvSHB3L9Qq--QzdTTZFkkQF8a9pJNumiqR0CowTKZzImTFraDw-8SMLEr01LQE0xn49zauEZXl6K1LTztDu93CFb1hRJ5p0HLsGDMIHeisQvcZLCchY07ZWnnXxWaarVl08_uyXE4xeru8ARgZPO0B9hpgYIEagJ-N0hJbYh7ph6G7IszenBYvNaqCmN9nnavmgxD_GCMMwNHXn5YeCD7SZbiDHgv4GY4QJcWMzi6REPrU51whcAQ"
    >
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Đăng nhập
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Vui lòng nhập thông tin của bạn để truy cập vào bảng điều khiển.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2"
            htmlFor="email"
          >
            Địa chỉ Email
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span
                className="material-symbols-outlined text-gray-400"
                style={{ fontSize: 20 }}
              >
                mail
              </span>
            </div>
            <input
              className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white disabled:opacity-70"
              id="email"
              name="email"
              placeholder="researcher@university.edu"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
              htmlFor="password"
            >
              Mật khẩu
            </label>
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary hover:text-red-700 transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </div>

          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span
                className="material-symbols-outlined text-gray-400"
                style={{ fontSize: 20 }}
              >
                lock
              </span>
            </div>
            <input
              className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white disabled:opacity-70"
              id="password"
              name="password"
              placeholder="••••••••"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <div>
          <button
            className="flex w-full justify-center rounded-lg bg-primary px-3 py-3 text-sm font-bold leading-6 text-white shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>
      </form>

      <div className="relative mt-8">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-background-dark px-2 text-sm text-gray-500 dark:text-gray-400">
            Hoặc tiếp tục với
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4">
        {/* --- NÚT GITHUB --- */}
        <button
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#24292F] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1f2428] transition-colors"
          type="button"
          onClick={() => handleFirebaseLogin("GitHub", githubProvider)}
          disabled={loading}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold leading-6">
            Đăng nhập bằng GitHub
          </span>
        </button>

        {/* --- NÚT GOOGLE --- */}
        <button
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-white dark:bg-gray-800 px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          type="button"
          onClick={() => handleFirebaseLogin("Google", googleProvider)}
          disabled={loading}
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M12.0003 20.45c4.6669 0 8.4503-3.7834 8.4503-8.45 0-.4168-.0334-.8251-.1001-1.2251h-8.3502v3.1334h4.7836c-.2083 1.1251-.8334 2.0751-1.7834 2.7084v2.2501h2.8918c1.6917-1.5584 2.6668-3.8585 2.6668-6.5001 0-.6917-.0834-1.3584-.2334-2.0001H12.0003v-3.15H21.5756c.1084.5167.1667 1.0501.1667 1.6001 0 5.8669-4.2252 10.5169-9.742 10.5169-5.4086 0-9.792-4.3835-9.792-9.792 0-5.4085 4.3834-9.7919 9.792-9.7919 2.6168 0 4.9752.9584 6.7836 2.5334l-2.2834 2.2834c-1.1834-1.1084-2.7335-1.7917-4.5002-1.7917-3.8835 0-7.0337 3.1501-7.0337 7.0336s3.1502 7.0336 7.0337 7.0336c2.4085 0 4.5003-1.2584 5.7003-3.1334l2.5835 1.5751c-1.5917 2.7667-4.5669 4.6334-8.2838 4.6334z"
              fill="#4285F4"
            />
          </svg>
          <span className="text-sm font-semibold leading-6">
            Đăng nhập bằng Google
          </span>
        </button>
      </div>

      <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Chưa có tài khoản?{" "}
        <Link
          className="font-semibold leading-6 text-primary hover:text-red-700 transition-colors"
          to="/register"
        >
          Đăng ký miễn phí
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;