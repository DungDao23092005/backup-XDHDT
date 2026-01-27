// src/utils/errorUtils.js
export function toErrorMessage(e, fallback = "Có lỗi xảy ra") {
  const detail = e?.response?.data?.detail;

  

  if (!detail) return fallback;

  // detail là string
  if (typeof detail === "string") return detail;

  // detail là mảng lỗi pydantic
  if (Array.isArray(detail)) {
    return detail
      .map((x) => x?.msg || x?.message || JSON.stringify(x))
      .join(" | ");
  }

  // detail là object
  if (typeof detail === "object") {
    return detail?.msg || detail?.message || JSON.stringify(detail);
  }

  return String(detail);
}

export const extractErrorMessage = toErrorMessage;
