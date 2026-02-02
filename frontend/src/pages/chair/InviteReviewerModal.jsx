import React, { useEffect, useMemo, useState } from "react";
import reviewerApi from "../../api/reviewerApi";

const getInitials = (nameOrEmail = "") => {
  const s = (nameOrEmail || "").trim();
  if (!s) return "RV";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
};

// ---- helpers: parse interests có thể là array hoặc JSON string hoặc "a,b,c"
const normalizeInterests = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);

  if (typeof val === "string") {
    const s = val.trim();
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch (_) {}
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeReviewer = (u) => {
  const organization = u.organization || u.org || u.affiliation || u.company || "";
  const department = u.department || u.dept || "";
  const interests = normalizeInterests(u.research_interests ?? u.researchInterests ?? u.interests);

  return {
    ...u,
    _organization: String(organization || "").trim(),
    _department: String(department || "").trim(),
    _interests: interests,
  };
};

// ---- UI-only: lấy text hiển thị cho 2 cột
const pickAffiliation = (u) => {
  const org = (u?._organization ?? u?.organization ?? u?.org ?? u?.affiliation ?? u?.company ?? "").trim?.() ?? "";
  const dept = (u?._department ?? u?.department ?? u?.dept ?? "").trim?.() ?? "";

  if (dept && org) return `${dept} — ${org}`;
  return org || dept || "—";
};

const pickInterests = (u) => {
  const arr = u?._interests ?? u?.research_interests ?? u?.researchInterests ?? u?.interests ?? u?.tags ?? [];
  const parsed = normalizeInterests(arr);
  return Array.isArray(parsed) ? parsed : [];
};

export default function InviteReviewerModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [reviewers, setReviewers] = useState([]);

  // UI states
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState(""); // UI-only
  const [orgFilter, setOrgFilter] = useState(""); // UI-only
  const [message, setMessage] = useState("");

  // multi-select
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        setLoadingList(true);
        const revList = await reviewerApi.getReviewerAccounts();
        const list = Array.isArray(revList) ? revList : [];
        setReviewers(list.map(normalizeReviewer));
      } catch (err) {
        console.error(err);
        setReviewers([]);
      } finally {
        setLoadingList(false);
        setSelectedIds(new Set());
        setSearch("");
        setFieldFilter("");
        setOrgFilter("");
        setMessage("");
      }
    };

    load();
  }, [open]);

  // hiện tại chỉ filter theo search (dropdown giữ UI giống mẫu, chưa lọc thật)
  const filteredReviewers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reviewers || [];
    if (!q) return list;

    return list.filter((u) => {
      const name = (u.name || u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [reviewers, search]);

  const allChecked = useMemo(() => {
    if (!filteredReviewers.length) return false;
    return filteredReviewers.every((u) => selectedIds.has(String(u.id)));
  }, [filteredReviewers, selectedIds]);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  if (!open) return null;

  const toggleOne = (id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        filteredReviewers.forEach((u) => next.delete(String(u.id)));
      } else {
        filteredReviewers.forEach((u) => next.add(String(u.id)));
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      alert("Vui lòng chọn ít nhất 1 Reviewer");
      return;
    }

    const chosen = reviewers.filter((u) => selectedIds.has(String(u.id)));
    const invalid = chosen.filter((u) => !u.email);
    if (invalid.length) {
      alert("Có reviewer không có email hợp lệ. Vui lòng bỏ chọn reviewer đó.");
      return;
    }

    try {
      setLoading(true);

      for (const u of chosen) {
        await reviewerApi.inviteReviewer({
          reviewer_email: u.email,
          reviewer_name: u.name || u.full_name || "Reviewer",
          description: message || "",
        });
      }

      alert(`Đã gửi lời mời tới ${chosen.length} reviewer`);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      alert(err?.response?.data?.detail || "Mời reviewer thất bại");
      console.error(err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-slate-900 w-[1080px] max-w-[96vw] h-[78vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Header (gọn) */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Mời Reviewer từ danh sách hệ thống
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Chọn các chuyên gia phù hợp để gửi lời mời tham gia hội nghị
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-2 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Filters (gọn) */}
      <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            className="w-full h-10 pl-10 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-primary focus:border-primary"
            placeholder="Tìm chuyên gia theo tên, email..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <select
            className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-primary focus:border-primary"
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
          >
            <option value="">Lĩnh vực chuyên môn</option>
            <option value="it">Information Technology</option>
            <option value="mechanical">Mechanical Engineering</option>
            <option value="economy">Economics</option>
            <option value="maritime">Maritime Science</option>
          </select>

          <select
            className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-primary focus:border-primary"
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
          >
            <option value="">Tất cả đơn vị</option>
            <option value="uth">Trường ĐH UTH</option>
            <option value="out">Đơn vị ngoài</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
            <tr>
              <th className="px-6 py-3 w-12">
                <input
                  className="size-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  disabled={loadingList || filteredReviewers.length === 0}
                />
              </th>

              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Họ tên &amp; Email
              </th>

              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Đơn vị công tác
              </th>

              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Lĩnh vực chuyên môn (Research Interests)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loadingList ? (
              <tr>
                <td className="px-6 py-10 text-center text-slate-500" colSpan={4}>
                  Đang tải danh sách reviewer...
                </td>
              </tr>
            ) : filteredReviewers.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-center text-slate-500" colSpan={4}>
                  Không có reviewer.
                </td>
              </tr>
            ) : (
              filteredReviewers.map((u) => {
                const id = String(u.id);
                const name = u.name || u.full_name || "Reviewer";
                const email = u.email || "—";
                const initials = getInitials(name || email);

                const affiliation = pickAffiliation(u);
                const interests = pickInterests(u);

                return (
                  <tr key={id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* checkbox */}
                    <td className="px-6 py-3 align-middle">
                      <input
                        className="size-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        type="checkbox"
                        checked={selectedIds.has(id)}
                        onChange={() => toggleOne(id)}
                      />
                    </td>

                    {/* name/email */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center font-bold text-[11px] uppercase">
                          {initials}
                        </div>
                        <div className="leading-tight">
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{name}</p>
                          <p className="text-xs text-slate-500">{email}</p>
                        </div>
                      </div>
                    </td>

                    {/* affiliation */}
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {affiliation || <span className="text-slate-400">—</span>}
                    </td>

                    {/* interests */}
                    <td className="px-6 py-3">
                      {Array.isArray(interests) && interests.length ? (
                        <div className="flex flex-wrap gap-2">
                          {interests.slice(0, 4).map((tag, idx) => (
                            <span
                              key={`${id}-tag-${idx}`}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer (gọn, giống ảnh) */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">
          Đã chọn{" "}
          <span className="text-primary font-bold">{String(selectedCount).padStart(2, "0")}</span>{" "}
          chuyên gia
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="h-10 px-6 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
            type="button"
            disabled={loading}
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || selectedCount === 0}
            className="h-10 px-6 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-60"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            {loading ? "Đang gửi..." : "Gửi lời mời"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

}
