export function getResolvedTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function parseISOAssumeUTC(iso) {
  if (!iso) return null;
  const s = String(iso);

  const hasTZ =
    s.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(s) ||
    /[+-]\d{4}$/.test(s);

  const normalized = hasTZ ? s : `${s}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatNotificationTime(iso, uiSettings) {
  const d = parseISOAssumeUTC(iso);
  if (!d) return "";

  const tz =
    uiSettings?.timezone && uiSettings.timezone !== "auto"
      ? uiSettings.timezone
      : undefined;

  const hour12 = uiSettings?.timeFormat === "12h";

  const now = new Date();

  const fmtDay = new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const sameDay = fmtDay.format(d) === fmtDay.format(now);

  if (sameDay) {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    }).format(d);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
