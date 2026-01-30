import React from "react";
import { Link } from "react-router-dom";

const AuthLayout = ({ children, title, subtitle, imageSrc }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      {/* HEADER GIỐNG NHAU CHO TẤT CẢ */}
      <div className="flex flex-1 w-full h-screen overflow-hidden">
        {/* LEFT SIDE (IMAGE) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-black">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-80"
            style={{
              backgroundImage: `url("${imageSrc || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAGcpns02FBknLcXNQqOGOswFvSHB3L9Qq--QzdTTZFkkQF8a9pJNumiqR0CowTKZzImTFraDw-8SMLEr01LQE0xn49zauEZXl6K1LTztDu93CFb1hRJ5p0HLsGDMIHeisQvcZLCchY07ZWnnXxWaarVl08_uyXE4xeru8ARgZPO0B9hpgYIEagJ-N0hJbYh7ph6G7IszenBYvNaqCmN9nnavmgxD_GCMMwNHXn5YeCD7SZbiDHgv4GY4QJcWMzi6REPrU51whcAQ'}")`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="relative z-10 flex flex-col justify-end p-12 w-full text-white">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>school</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">UTH-ConfMS</h1>
              </div>

              <h2 className="text-3xl font-bold mb-4 leading-tight">
                {title || "Chào mừng trở lại"}
              </h2>
              
              <blockquote className="text-xl font-medium leading-relaxed max-w-lg mb-4 italic text-gray-300">
                "{subtitle || 'Hệ thống Quản lý Giấy tờ Hội nghị Nghiên cứu Khoa học Trường ĐH UTH.'}"
              </blockquote>
            </div>

            <div className="flex gap-4 text-sm text-gray-400">
              <span>© 2024 UTH-ConfMS</span>
              <button className="hover:text-white transition-colors">Chính sách bảo mật</button>
              <button className="hover:text-white transition-colors">Trợ giúp</button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (FORM CONTENT) - Thay đổi tùy trang */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-background-dark overflow-y-auto relative">
           {/* Mobile Header Logo */}
           <div className="lg:hidden p-6 flex items-center gap-2 absolute top-0 left-0">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <h2 className="text-gray-900 dark:text-white text-xl font-bold">UTH-ConfMS</h2>
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 xl:px-32 py-12">
            <div className="w-full max-w-md mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;