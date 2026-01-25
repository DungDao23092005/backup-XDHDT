import React from "react";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-white antialiased overflow-x-hidden">
      <div className="relative flex min-h-screen flex-col">
        {/* ================= HEADER ================= */}
        <header className="sticky top-0 z-50 w-full border-b border-solid border-b-[#e5dcdc] dark:border-b-[#3a2a2a] bg-white/95 dark:bg-[#211111]/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 md:px-10 max-w-[1440px] mx-auto w-full">
            <div className="flex items-center gap-4 text-[#181111] dark:text-white">
              <div className="size-8 text-primary">
                <svg
                  fill="currentColor"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">
                UTH-ConfMS
              </h2>
            </div>

            <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
              <div className="flex items-center gap-6 lg:gap-9">
                <a
                  className="text-sm font-medium leading-normal hover:text-primary transition-colors"
                  href="#"
                >
                  Trang chủ
                </a>
                <a
                  className="text-sm font-medium leading-normal hover:text-primary transition-colors"
                  href="#tracks"
                >
                  Chuyên đề
                </a>
                <a
                  className="text-sm font-medium leading-normal hover:text-primary transition-colors"
                  href="#deadlines"
                >
                  Hạn nộp
                </a>
                <a
                  className="text-sm font-medium leading-normal hover:text-primary transition-colors"
                  href="#"
                >
                  Hỏi đáp
                </a>

                {/* ✅ dùng Link để đúng React Router */}
                <Link
                  className="text-sm font-medium leading-normal hover:text-primary transition-colors"
                  to="/login"
                >
                  Đăng nhập
                </Link>
              </div>

              {/* ✅ Button đăng ký */}
              <Link
                to="/register"
                className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-primary hover:bg-red-700 transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]"
              >
                <span className="truncate">Đăng ký</span>
              </Link>
            </div>

            <button className="md:hidden text-2xl" type="button">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </header>

        {/* ================= MAIN ================= */}
        <main className="flex-grow w-full max-w-[1440px] mx-auto flex flex-col items-center">
          {/* ===== HERO ===== */}
          <section className="w-full px-4 py-10 md:px-10 lg:px-20 lg:py-20">
            <div className="@container">
              <div className="flex flex-col gap-10 lg:flex-row-reverse items-center">
                <div className="w-full lg:w-1/2">
                  <div
                    className="w-full aspect-video bg-center bg-no-repeat bg-cover rounded-xl shadow-lg relative overflow-hidden"
                    style={{
                      backgroundImage:
                        'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC5risfg4VW9R5zk9QvjhpPOrGJr9v2TotpIExleWe8lvoPveUJb8zrSabnwAnpUShp0kDATQNCI14AVM1hi8gX-RKAR4OG7JfkhF1OHHa8QRYbXy1jHvsn4-Bzbbvg8WRCBUpsBwl_55ZWP_WM4dolOWYnqFYT6iDmiIELudHc1SeJnqDc5c2S5B5kB_8vL0LGEK3Kyb4wdYS2QmjqE99CLFTLLl-2V6zLB6ZStiXczIJeGaVZJixDN6Fjb0epNS03nQ4RCPUC5NU")',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/10"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:w-1/2 lg:pr-10">
                  <div className="flex flex-col gap-4 text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary w-fit">
                      <span className="material-symbols-outlined text-[18px]">
                        calendar_month
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        12-14 Tháng 10, 2024
                      </span>
                    </div>

                    <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] md:text-5xl lg:text-6xl text-[#181111] dark:text-white">
                      Hội nghị Khoa học UTH <span className="text-primary">2024</span>
                    </h1>

                    <h2 className="text-lg text-gray-600 dark:text-gray-300 font-normal leading-relaxed">
                      Thúc đẩy Đổi mới thông qua Nghiên cứu &amp; Hợp tác. Gặp gỡ các
                      học giả hàng đầu và chuyên gia trong ngành tại Hội trường Chính.
                    </h2>

                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <span className="material-symbols-outlined text-[20px]">
                        location_on
                      </span>
                      <span>Hội trường Chính, Đại học Công nghệ UTH</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <Link
                      to="/login"
                      className="flex items-center justify-center rounded-lg h-12 px-8 bg-primary hover:bg-red-700 transition-colors text-white text-base font-bold shadow-md shadow-red-500/20"
                    >
                      Nộp bài báo
                    </Link>

                    <button
                      className="flex items-center justify-center rounded-lg h-12 px-8 bg-white dark:bg-white/5 border border-[#e5dcdc] dark:border-[#3a2a2a] hover:bg-gray-50 dark:hover:bg-white/10 transition-colors text-[#181111] dark:text-white text-base font-bold"
                      type="button"
                      onClick={() => alert("Chưa có file hướng dẫn")}
                    >
                      Tải xuống hướng dẫn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== TRACKS ===== */}
          <section
            className="w-full px-4 py-12 md:px-10 lg:px-20 bg-white dark:bg-[#1a0f0f] border-y border-[#f4f0f0] dark:border-[#2a1a1a]"
            id="tracks"
          >
            <div className="flex flex-col gap-10 @container">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex flex-col gap-3 max-w-[720px]">
                  <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl dark:text-white">
                    Chuyên đề Hội nghị
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Chúng tôi kính mời các tác giả gửi bài cho các chuyên đề nghiên cứu
                    sau. Vui lòng đảm bảo nội dung phù hợp với hướng dẫn trước khi nộp.
                  </p>
                </div>
                <a
                  className="flex items-center gap-2 text-primary font-bold hover:underline whitespace-nowrap"
                  href="#"
                >
                  Xem tất cả chuyên đề
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="group flex flex-col gap-4 rounded-xl border border-[#e5dcdc] dark:border-[#3a2a2a] bg-background-light dark:bg-[#211111] p-6 transition-all hover:shadow-lg hover:border-primary/30">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">smart_toy</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold leading-tight dark:text-white">
                      Trí tuệ nhân tạo
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Học máy, robot, thị giác máy tính và các ứng dụng mạng nơ-ron trong
                      công nghiệp hiện đại.
                    </p>
                  </div>
                  <a className="mt-auto pt-2 text-sm font-semibold text-primary group-hover:underline" href="#">
                    Xem hướng dẫn
                  </a>
                </div>

                {/* Card 2 */}
                <div className="group flex flex-col gap-4 rounded-xl border border-[#e5dcdc] dark:border-[#3a2a2a] bg-background-light dark:bg-[#211111] p-6 transition-all hover:shadow-lg hover:border-primary/30">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">eco</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold leading-tight dark:text-white">
                      Năng lượng bền vững
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Tài nguyên tái tạo, công nghệ xanh, lưới điện thông minh và đánh giá
                      tác động môi trường.
                    </p>
                  </div>
                  <a className="mt-auto pt-2 text-sm font-semibold text-primary group-hover:underline" href="#">
                    Xem hướng dẫn
                  </a>
                </div>

                {/* Card 3 */}
                <div className="group flex flex-col gap-4 rounded-xl border border-[#e5dcdc] dark:border-[#3a2a2a] bg-background-light dark:bg-[#211111] p-6 transition-all hover:shadow-lg hover:border-primary/30">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">
                      medical_services
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold leading-tight dark:text-white">
                      Khoa học Y sinh
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Nghiên cứu lâm sàng, tin sinh học, công nghệ y tế và các đổi mới trong
                      y tế công cộng.
                    </p>
                  </div>
                  <a className="mt-auto pt-2 text-sm font-semibold text-primary group-hover:underline" href="#">
                    Xem hướng dẫn
                  </a>
                </div>

                {/* Card 4 */}
                <div className="group flex flex-col gap-4 rounded-xl border border-[#e5dcdc] dark:border-[#3a2a2a] bg-background-light dark:bg-[#211111] p-6 transition-all hover:shadow-lg hover:border-primary/30">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">engineering</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold leading-tight dark:text-white">
                      Kỹ thuật Xây dựng
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Quy hoạch đô thị, kết cấu công trình, thành phố thông minh và vật liệu
                      xây dựng bền vững.
                    </p>
                  </div>
                  <a className="mt-auto pt-2 text-sm font-semibold text-primary group-hover:underline" href="#">
                    Xem hướng dẫn
                  </a>
                </div>

                {/* Card 5 */}
                <div className="group flex flex-col gap-4 rounded-xl border border-[#e5dcdc] dark:border-[#3a2a2a] bg-background-light dark:bg-[#211111] p-6 transition-all hover:shadow-lg hover:border-primary/30">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">security</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold leading-tight dark:text-white">An ninh mạng</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Phòng thủ mạng, mật mã học, công nghệ blockchain và điều tra số.
                    </p>
                  </div>
                  <a className="mt-auto pt-2 text-sm font-semibold text-primary group-hover:underline" href="#">
                    Xem hướng dẫn
                  </a>
                </div>

                {/* Card 6 */}
                <div className="group flex flex-col gap-4 rounded-xl border border-[#e5dcdc] dark:border-[#3a2a2a] bg-background-light dark:bg-[#211111] p-6 transition-all hover:shadow-lg hover:border-primary/30">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">school</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold leading-tight dark:text-white">
                      Công nghệ Giáo dục
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Nền tảng E-learning, gamification và các công cụ kỹ thuật số cho sư phạm hiện đại.
                    </p>
                  </div>
                  <a className="mt-auto pt-2 text-sm font-semibold text-primary group-hover:underline" href="#">
                    Xem hướng dẫn
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ===== DEADLINES (CHỈ 1 LẦN - timeline chuẩn) ===== */}
          <section className="w-full px-4 py-16 md:px-10 lg:px-20" id="deadlines">
            <div className="flex flex-col gap-12 max-w-[1000px] mx-auto">
              <div className="text-center">
                <h2 className="text-3xl font-bold leading-tight tracking-tight dark:text-white">
                  Các mốc thời gian quan trọng
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Đừng bỏ lỡ các hạn chót. Bài nộp muộn sẽ không được chấp nhận.
                </p>
              </div>

              <div className="relative hidden md:block">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-[#e5dcdc] dark:bg-[#3a2a2a] -translate-y-1/2 rounded-full"></div>

                <div className="relative flex justify-between w-full">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative z-10 flex items-center justify-center size-10 rounded-full bg-primary text-white ring-4 ring-white dark:ring-[#211111]">
                      <span className="material-symbols-outlined text-lg">check</span>
                    </div>
                    <div className="absolute top-14 flex flex-col items-center text-center w-40">
                      <span className="text-sm font-bold text-gray-400 line-through">15/08</span>
                      <span className="text-sm font-medium text-gray-400">Nộp tóm tắt</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="relative z-10 flex items-center justify-center size-12 rounded-full bg-primary text-white ring-4 ring-white dark:ring-[#211111] shadow-[0_0_0_4px_rgba(234,42,51,0.2)]">
                      <span className="material-symbols-outlined text-xl">upload_file</span>
                    </div>
                    <div className="absolute top-14 flex flex-col items-center text-center w-40">
                      <span className="text-base font-bold text-primary">10/09</span>
                      <span className="text-base font-bold text-[#181111] dark:text-white">
                        Hạn nộp toàn văn
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="relative z-10 flex items-center justify-center size-10 rounded-full bg-white dark:bg-[#211111] border-2 border-[#e5dcdc] dark:border-[#3a2a2a] text-gray-400 ring-4 ring-white dark:ring-[#211111]">
                      <span className="material-symbols-outlined text-lg">rate_review</span>
                    </div>
                    <div className="absolute top-14 flex flex-col items-center text-center w-40">
                      <span className="text-sm font-bold text-[#181111] dark:text-white">25/09</span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Thông báo kết quả
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="relative z-10 flex items-center justify-center size-10 rounded-full bg-white dark:bg-[#211111] border-2 border-[#e5dcdc] dark:border-[#3a2a2a] text-gray-400 ring-4 ring-white dark:ring-[#211111]">
                      <span className="material-symbols-outlined text-lg">camera_enhance</span>
                    </div>
                    <div className="absolute top-14 flex flex-col items-center text-center w-40">
                      <span className="text-sm font-bold text-[#181111] dark:text-white">05/10</span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Nộp bản in
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="relative z-10 flex items-center justify-center size-10 rounded-full bg-white dark:bg-[#211111] border-2 border-[#e5dcdc] dark:border-[#3a2a2a] text-gray-400 ring-4 ring-white dark:ring-[#211111]">
                      <span className="material-symbols-outlined text-lg">event</span>
                    </div>
                    <div className="absolute top-14 flex flex-col items-center text-center w-40">
                      <span className="text-sm font-bold text-[#181111] dark:text-white">12/10</span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Ngày hội nghị
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block h-24"></div>

              <div className="flex flex-col md:hidden gap-6 relative pl-4 border-l-2 border-[#e5dcdc] dark:border-[#3a2a2a] ml-4">
                <div className="flex flex-col gap-1 relative">
                  <div className="absolute -left-[21px] top-1 size-3 rounded-full bg-primary ring-4 ring-white dark:ring-[#211111]"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider line-through">
                    15/08
                  </span>
                  <h3 className="text-base font-medium text-gray-400">Nộp tóm tắt</h3>
                </div>

                <div className="flex flex-col gap-1 relative">
                  <div className="absolute -left-[23px] top-1 size-4 rounded-full bg-primary ring-4 ring-white dark:ring-[#211111] shadow-[0_0_0_4px_rgba(234,42,51,0.2)]"></div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">10/09</span>
                  <h3 className="text-lg font-bold text-[#181111] dark:text-white">
                    Hạn nộp toàn văn
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nộp bản thảo cuối cùng để phản biện.
                  </p>
                </div>

                <div className="flex flex-col gap-1 relative">
                  <div className="absolute -left-[21px] top-1 size-3 rounded-full bg-[#e5dcdc] dark:bg-[#3a2a2a] ring-4 ring-white dark:ring-[#211111]"></div>
                  <span className="text-xs font-bold text-[#181111] dark:text-white uppercase tracking-wider">
                    25/09
                  </span>
                  <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">
                    Thông báo kết quả
                  </h3>
                </div>

                <div className="flex flex-col gap-1 relative">
                  <div className="absolute -left-[21px] top-1 size-3 rounded-full bg-[#e5dcdc] dark:bg-[#3a2a2a] ring-4 ring-white dark:ring-[#211111]"></div>
                  <span className="text-xs font-bold text-[#181111] dark:text-white uppercase tracking-wider">
                    05/10
                  </span>
                  <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">
                    Nộp bản in (Camera Ready)
                  </h3>
                </div>

                <div className="flex flex-col gap-1 relative">
                  <div className="absolute -left-[21px] top-1 size-3 rounded-full bg-[#e5dcdc] dark:bg-[#3a2a2a] ring-4 ring-white dark:ring-[#211111]"></div>
                  <span className="text-xs font-bold text-[#181111] dark:text-white uppercase tracking-wider">
                    12/10
                  </span>
                  <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">
                    Ngày hội nghị
                  </h3>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ================= FOOTER ================= */}
        <footer className="bg-white dark:bg-[#150a0a] border-t border-[#e5dcdc] dark:border-[#3a2a2a] pt-12 pb-8">
          <div className="max-w-[1440px] mx-auto px-4 md:px-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[#181111] dark:text-white">
                  <div className="size-6 text-primary">
                    <svg
                      fill="currentColor"
                      viewBox="0 0 48 48"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z"></path>
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold">UTH-ConfMS</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Hệ thống quản lý hội nghị chính thức của Đại học Công nghệ &amp; Sức
                  khỏe UTH.
                </p>
              </div>

              <div>
                <h3 className="font-bold mb-4 dark:text-white">Liên kết nhanh</h3>
                <ul className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><a className="hover:text-primary" href="#">Trang chủ</a></li>
                  <li><a className="hover:text-primary" href="#">Kêu gọi viết bài</a></li>
                  <li><Link className="hover:text-primary" to="/register">Đăng ký</Link></li>
                  <li><a className="hover:text-primary" href="#">Ban tổ chức</a></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-4 dark:text-white">Tài nguyên</h3>
                <ul className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><a className="hover:text-primary" href="#">Hướng dẫn tác giả</a></li>
                  <li><a className="hover:text-primary" href="#">Hướng dẫn phản biện</a></li>
                  <li><a className="hover:text-primary" href="#">Hội nghị trước</a></li>
                  <li><a className="hover:text-primary" href="#">Hỗ trợ</a></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-4 dark:text-white">Liên hệ</h3>
                <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">email</span>
                    <span>conf@uth.edu.vn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>+84 (28) 3123-4567</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    <span>Khu A, Cơ sở chính</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e5dcdc] dark:border-[#3a2a2a] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-gray-500 text-center md:text-left">
                © 2024 Hội nghị Khoa học UTH. Bảo lưu mọi quyền.
              </p>
              <div className="flex gap-4">
                <a className="text-gray-400 hover:text-primary" href="#">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                  </svg>
                </a>
                <a className="text-gray-400 hover:text-primary" href="#">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path>
                  </svg>
                </a>
                <a className="text-gray-400 hover:text-primary" href="#">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
