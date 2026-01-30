export function resolveTZ(tz) {
  if (!tz || tz === "auto") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return tz;
}

export function formatDateTimeTZ(iso, { timeZone = "auto", timeFormat = "24h" } = {}) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";

  const tz = resolveTZ(timeZone);
  const hour12 = timeFormat === "12h";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(d);
}

export function formatDateTZ(iso, { timeZone = "auto" } = {}) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const tz = resolveTZ(timeZone);

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatTimeTZ(iso, { timeZone = "auto", timeFormat = "24h" } = {}) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const tz = resolveTZ(timeZone);
  const hour12 = timeFormat === "12h";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(d);
}
