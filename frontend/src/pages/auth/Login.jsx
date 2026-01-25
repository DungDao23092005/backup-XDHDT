import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// [QUAN TRỌNG] Import useAuth để đồng bộ trạng thái đăng nhập
import { useAuth } from "../../context/AuthContext";
import { getUserRole } from "../../utils/auth";

const Login = () => {
  const navigate = useNavigate();
  // Lấy hàm login từ Context (Hàm này đã xử lý lưu token và cập nhật state User)
  const { login } = useAuth(); 

  const [formData, setFormData] = useState({
    email: "admin@uth.edu.vn",
    password: "123456",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const redirectByRole = (role) => {
    // Xử lý trường hợp role trả về là mảng hoặc chuỗi
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.warning("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      // [QUAN TRỌNG] Gọi hàm login của Context thay vì gọi API trực tiếp
      await login(formData.email, formData.password);

      toast.success("✅ Đăng nhập thành công!");

      // Lấy role từ token (lúc này token đã được lưu trong localStorage)
      const role = getUserRole();
      
      // Nếu không có role hoặc role rỗng -> mặc định về author
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
        toast.error(err.message || "Không thể kết nối đến server. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOrcid = () => toast.info("ORCID login: Chưa tích hợp.");
  const handleGoogle = () => toast.info("Google login: Chưa tích hợp.");

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col">
      <div className="flex flex-1 w-full h-screen overflow-hidden">
        {/* Left (image) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-black">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-80"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDAGcpns02FBknLcXNQqOGOswFvSHB3L9Qq--QzdTTZFkkQF8a9pJNumiqR0CowTKZzImTFraDw-8SMLEr01LQE0xn49zauEZXl6K1LTztDu93CFb1hRJ5p0HLsGDMIHeisQvcZLCchY07ZWnnXxWaarVl08_uyXE4xeru8ARgZPO0B9hpgYIEagJ-N0hJbYh7ph6G7IszenBYvNaqCmN9nnavmgxD_GCMMwNHXn5YeCD7SZbiDHgv4GY4QJcWMzi6REPrU51whcAQ")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="relative z-10 flex flex-col justify-end p-12 w-full text-white">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28 }}
                  >
                    school
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">UTH-ConfMS</h1>
              </div>

              <blockquote className="text-xl font-medium leading-relaxed max-w-lg mb-4 italic">
                "Hệ thống quản lý hội nghị UTH đã đơn giản hóa quy trình nộp bài học
                thuật của chúng tôi, giúp các nhà nghiên cứu chia sẻ công trình đột
                phá của họ dễ dàng hơn."
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  <img
                    alt="Ảnh đại diện của Tiến sĩ Sarah Chen"
                    className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwXuk3EFJFtL_aE0oElE_0OcbBDjsSv0ty2vkN2eWcM_kJF56S26TzUB-0UeoGOM7J-QWNZBsg7hNBTplbNsz6qYgFrndWO_jyZ6YYdovgW1UW6i6K08pKdkofX3oC0_JZhgOT9Ibwn59U5NzxUSrCg6QXt0nRG6AOfdnKNXWd4hg0G5_4AAidGqCazU98-I3DiYEVA-E5Asob6oUCvb708PzOQ1VTK1NDGf5YDWhIgMdHLk-VEYj0YaglYJaD5IY3OEno7Og8xZU"
                  />
                  <img
                    alt="Ảnh đại diện của Giáo sư James Wilson"
                    className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH2ijgyGezgyK2EomFiip-wRe0WjUdZG1cPG0gdwLE2Dv6pZ9slc0pHVovUW9uZsO2mZ8g_YZnuVGlAVqlkVwotnkoNJS3Ph8LwOUrO_-xOGUiTQChQMZ9mqnJcEmiI6Y-9IesKIt80oVOd6aMIGdefXU9xF1ClWH270ETVKK47GyuzFXTpkMTwyWeU8T7DDsdEr2gEcnhmuTWoB5oS102MvE8Kf1IhTsSYRzEhsguQkEgF8bHhevl5Jv3KudUuLkT_kHbiqx436o"
                  />
                  <div className="h-10 w-10 rounded-full ring-2 ring-white bg-gray-800 flex items-center justify-center text-xs font-bold text-white">
                    +2k
                  </div>
                </div>
                <span className="text-sm text-gray-300">
                  Được tin dùng bởi các nhà nghiên cứu trên toàn cầu
                </span>
              </div>
            </div>

            <div className="flex gap-2 text-sm text-gray-400">
              <a className="hover:text-white transition-colors" href="#">
                Chính sách bảo mật
              </a>
              <span>•</span>
              <a className="hover:text-white transition-colors" href="#">
                Điều khoản dịch vụ
              </a>
            </div>
          </div>
        </div>

        {/* Right (form) */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-background-dark overflow-y-auto">
          <div className="lg:hidden p-6 flex items-center gap-2">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <h2 className="text-gray-900 dark:text-white text-xl font-bold">
              UTH-ConfMS
            </h2>
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 xl:px-32 py-12">
            <div className="w-full max-w-md mx-auto">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Chào mừng trở lại
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
                      <a className="font-medium text-primary hover:text-red-700" href="#">
                        Quên mật khẩu?
                      </a>
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
                <button
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-white dark:bg-gray-800 px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  type="button"
                  onClick={handleOrcid}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    <path d="M6.5 7h2v10h-2V7zm4.5 10h2v-6h-2v6zm0-8h2V7h-2v2zm6 8h-2v-4.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5V17h-2v-6h2v1.07c.563-.842 1.487-1.07 2.227-1.07 1.763 0 2.773 1.255 2.773 3.5V17z" />
                  </svg>
                  <span className="text-sm font-semibold leading-6">Đăng nhập bằng ORCID</span>
                </button>

                <button
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-white dark:bg-gray-800 px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  type="button"
                  onClick={handleGoogle}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;