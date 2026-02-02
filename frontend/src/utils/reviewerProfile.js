// src/utils/reviewerProfile.js

export function safeArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}

    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

export function pickAffiliation(u) {
  const org =
    u?.organization ||
    u?.org ||
    u?.affiliation ||
    u?.workplace ||
    u?.company ||
    "";

  const dept =
    u?.department ||
    u?.dept ||
    u?.faculty ||
    u?.unit ||
    "";

  const orgText = String(org || "").trim();
  const deptText = String(dept || "").trim();

  if (orgText && deptText) return `${deptText} — ${orgText}`;
  return orgText || deptText || "—";
}

export function pickInterests(u) {
  const raw =
    u?.research_interests ??
    u?.researchInterests ??
    u?.interests ??
    u?.fields ??
    [];

  return safeArray(raw);
}

export function isUTH(u) {
  const email = (u?.email || "").toLowerCase();
  const org = (u?.organization || "").toLowerCase();
  return email.endsWith("@uth.edu.vn") || org.includes("uth");
}

export function matchField(u, fieldFilter) {
  if (!fieldFilter) return true;

  const tags = pickInterests(u).join(" ").toLowerCase();
  const key =
    fieldFilter === "it"
      ? "information technology"
      : fieldFilter === "mechanical"
      ? "mechanical"
      : fieldFilter === "economy"
      ? "econom"
      : fieldFilter === "maritime"
      ? "maritime"
      : String(fieldFilter).toLowerCase();

  return tags.includes(key);
}
