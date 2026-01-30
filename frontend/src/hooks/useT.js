// src/hooks/useT.js
const VI = {
  "settings.title": "Cài đặt Tài khoản",
  "settings.subtitle": "Quản lý tùy chọn cá nhân, thông báo và bảo mật tài khoản.",
  "settings.langRegion": "Ngôn ngữ & Vùng",
  "settings.languageLabel": "Ngôn ngữ hiển thị",
  "settings.timezoneLabel": "Múi giờ cá nhân",
  "settings.timezoneHint": "Tùy chọn này giúp hiển thị đúng giờ trong Thông báo/Bài nộp (frontend).",
  "common.cancel": "Hủy bỏ",
  "common.save": "Lưu cài đặt",
};

export function useT() {
  return (key) => VI[key] || key;
}
