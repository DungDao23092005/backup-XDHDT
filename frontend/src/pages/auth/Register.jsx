import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import authApi from "../../api/authApi";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: true,
  });

  const [loading, setLoading] = useState(false);

  const passwordHint = useMemo(() => {
    const p = formData.password || "";
    const okLen = p.length >= 6;
    const hasNum = /\d/.test(p);
    const hasLetter = /[A-Za-z]/.test(p);
    return { okLen, hasNum, hasLetter };
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (!formData.fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (!formData.email.trim()) return "Vui lòng nhập email.";
    if (!formData.password) return "Vui lòng nhập mật khẩu.";
    if (formData.password.length < 6) return "Mật khẩu tối thiểu 6 ký tự.";
    if (formData.password !== formData.confirmPassword)
      return "Mật khẩu nhập lại không khớp.";
    if (!formData.agree) return "Bạn cần đồng ý điều khoản để tiếp tục.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.warning(err);

    setLoading(true);
    try {
      // ✅ Call API register thật (khớp schema backend)
      await authApi.register({
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      toast.success("✅ Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Register error:", error);
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;

      if (status === 400) {
        toast.error(detail || "Email đã tồn tại hoặc dữ liệu không hợp lệ!");
      } else if (status === 422) {
        toast.error("Dữ liệu không hợp lệ (422). Vui lòng kiểm tra lại.");
      } else {
        toast.error(status ? `Lỗi server (${status}).` : "Không thể kết nối server!");
      }
    } finally {
      setLoading(false);
    }
  };

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
                "Tạo tài khoản để bắt đầu nộp bài, theo dõi phản biện và quản lý
                hồ sơ hội nghị của bạn ngay hôm nay."
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  <img
                    alt="Nhà nghiên cứu 1"
                    className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwXuk3EFJFtL_aE0oElE_0OcbBDjsSv0ty2vkN2eWcM_kJF56S26TzUB-0UeoGOM7J-QWNZBsg7hNBTplbNsz6qYgFrndWO_jyZ6YYdovgW1UW6i6K08pKdkofX3oC0_JZhgOT9Ibwn59U5NzxUSrCg6QXt0nRG6AOfdnKNXWd4hg0G5_4AAidGqCazU98-I3DiYEVA-E5Asob6oUCvb708PzOQ1VTK1NDGf5YDWhIgMdHLk-VEYj0YaglYJaD5IY3OEno7Og8xZU"
                  />
                  <img
                    alt="Nhà nghiên cứu 2"
                    className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH2ijgyGezgyK2EomFiip-wRe0WjUdZG1cPG0gdwLE2Dv6pZ9slc0pHVovUW9uZsO2mZ8g_YZnuVGlAVqlkVwotnkoNJS3Ph8LwOUrO_-xOGUiTQChQMZ9mqnJcEmiI6Y-9IesKIt80oVOd6aMIGdefXU9xF1ClWH270ETVKK47GyuzFXTpkMTwyWeU8T7DDsdEr2gEcnhmuTWoB5oS102MvE8Kf1IhTsSYRzEhsguQkEgF8bHhevl5Jv3KudUuLkT_kHbiqx436o"
                  />
                  <div className="h-10 w-10 rounded-full ring-2 ring-white bg-gray-800 flex items-center justify-center text-xs font-bold text-white">
                    +2k
                  </div>
                </div>
                <span className="text-sm text-gray-300">
                  Cộng đồng học thuật đang phát triển
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
                  Tạo tài khoản
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Điền thông tin để đăng ký và bắt đầu sử dụng hệ thống.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full name */}
                <div>
                  <label
                    className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2"
                    htmlFor="fullName"
                  >
                    Họ và tên
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span
                        className="material-symbols-outlined text-gray-400"
                        style={{ fontSize: 20 }}
                      >
                        badge
                      </span>
                    </div>
                    <input
                      className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white disabled:opacity-70"
                      id="fullName"
                      name="fullName"
                      placeholder="Nguyễn Văn A"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
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

                {/* Password */}
                <div>
                  <label
                    className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2"
                    htmlFor="password"
                  >
                    Mật khẩu
                  </label>
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
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {/* Hint */}
                  <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-xs">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18 }}
                      >
                        info
                      </span>
                      <span>Gợi ý mật khẩu:</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          {passwordHint.okLen
                            ? "check_circle"
                            : "radio_button_unchecked"}
                        </span>
                        Tối thiểu 6 ký tự
                      </li>
                      <li className="flex items-center gap-2">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          {passwordHint.hasLetter
                            ? "check_circle"
                            : "radio_button_unchecked"}
                        </span>
                        Có ít nhất 1 chữ cái
                      </li>
                      <li className="flex items-center gap-2">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          {passwordHint.hasNum
                            ? "check_circle"
                            : "radio_button_unchecked"}
                        </span>
                        Có ít nhất 1 chữ số
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2"
                    htmlFor="confirmPassword"
                  >
                    Nhập lại mật khẩu
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span
                        className="material-symbols-outlined text-gray-400"
                        style={{ fontSize: 20 }}
                      >
                        lock_reset
                      </span>
                    </div>
                    <input
                      className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white disabled:opacity-70"
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="••••••••"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {/* Agree */}
                <div className="flex items-start gap-3">
                  <input
                    id="agree"
                    name="agree"
                    type="checkbox"
                    checked={formData.agree}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="agree"
                    className="text-sm text-gray-600 dark:text-gray-300"
                  >
                    Tôi đồng ý với{" "}
                    <a
                      className="font-semibold text-primary hover:text-red-700"
                      href="#"
                    >
                      Điều khoản dịch vụ
                    </a>{" "}
                    và{" "}
                    <a
                      className="font-semibold text-primary hover:text-red-700"
                      href="#"
                    >
                      Chính sách bảo mật
                    </a>
                    .
                  </label>
                </div>

                {/* Submit */}
                <div>
                  <button
                    className="flex w-full justify-center rounded-lg bg-primary px-3 py-3 text-sm font-bold leading-6 text-white shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
                  </button>
                </div>
              </form>

              <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Đã có tài khoản?{" "}
                <Link
                  className="font-semibold leading-6 text-primary hover:text-red-700 transition-colors"
                  to="/login"
                >
                  Đăng nhập
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
