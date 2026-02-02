import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewerApi from "../../api/reviewerApi";
import InviteReviewerModal from "./InviteReviewerModal";



const statusMap = {
  ACCEPTED: { text: "Đã chấp nhận", cls: "bg-green-100 text-green-700" },
  PENDING: { text: "Chờ phản hồi", cls: "bg-amber-100 text-amber-700" },
  DECLINED: { text: "Từ chối", cls: "bg-red-100 text-red-700" },
};

// ---- helpers: parse interests có thể là array hoặc JSON string hoặc "a,b,c"
const normalizeInterests = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);

  if (typeof val === "string") {
    const s = val.trim();
    // thử parse JSON
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch (_) {}

    // fallback: "a, b, c"
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

const pickAffiliation = (acc) => {
  if (!acc) return "—";
  const org = String(acc.organization || acc.org || acc.affiliation || acc.company || "").trim();
  const dept = String(acc.department || acc.dept || acc.faculty || "").trim();
  if (dept && org) return `${dept} — ${org}`;
  return org || dept || "—";
};

const pickInterests = (acc) => {
  if (!acc) return [];
  const raw = acc.research_interests ?? acc.researchInterests ?? acc.interests ?? acc.tags ?? [];
  return normalizeInterests(raw);
};

// ✅ DEDUPE KEY: ưu tiên email, fallback theo tên
const makeReviewerKey = (inv, acc) => {
  const email = (acc?.email || inv?.reviewer_email || "").toLowerCase().trim();
  if (email) return `email:${email}`;

  const name = (acc?.full_name || acc?.name || inv?.reviewer_name || "").toLowerCase().trim();
  if (name) return `name:${name}`;

  return `unknown:${String(acc?.id || inv?.id || Math.random())}`;
};

export default function ReviewerManagementPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]); // invitations
  const [reviewerAccounts, setReviewerAccounts] = useState([]); // identity users
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [openInvite, setOpenInvite] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inv, accounts] = await Promise.all([
        reviewerApi.getInvitations(),
        reviewerApi.getReviewerAccounts(),
      ]);

      setItems(Array.isArray(inv) ? inv : []);
      setReviewerAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (e) {
      console.error(e);
      setItems([]);
      setReviewerAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // summary theo invitations (tổng quan)
  const total = items.length;
  const accepted = items.filter((i) => i.status === "ACCEPTED").length;
  const pending = items.filter((i) => i.status === "PENDING").length;
  const declined = items.filter((i) => i.status === "DECLINED").length;

  // map email -> account
  const accountByEmail = useMemo(() => {
    const m = new Map();
    reviewerAccounts.forEach((u) => {
      const email = (u.email || "").toLowerCase().trim();
      if (email) m.set(email, u);
    });
    return m;
  }, [reviewerAccounts]);

  // ✅ table: accepted + có account + GỘP theo email (tránh trùng)
  const tableRows = useMemo(() => {
    const acceptedList = (items || []).filter((i) => String(i.status).toUpperCase() === "ACCEPTED");

    const withAcc = acceptedList
      .map((inv) => {
        const acc = accountByEmail.get((inv.reviewer_email || "").toLowerCase().trim()) || null;
        return { ...inv, account: acc };
      })
      .filter((x) => !!x.account);

    // dedupe
    const dedupMap = new Map();
    for (const row of withAcc) {
      const key = makeReviewerKey(row, row.account);

      if (!dedupMap.has(key)) {
        dedupMap.set(key, row);
      } else {
        // optional: nếu muốn ưu tiên record "mới hơn" (id lớn hơn) thì bật đoạn này
        const prev = dedupMap.get(key);
        const prevId = Number(prev?.id ?? 0);
        const curId = Number(row?.id ?? 0);
        if (curId > prevId) dedupMap.set(key, row);
      }
    }

    return Array.from(dedupMap.values());
  }, [items, accountByEmail]);

  const handleDelete = async (id) => {
    const ok = window.confirm("Bạn có chắc muốn xóa reviewer này khỏi hội nghị?");
    if (!ok) return;

    try {
      setDeletingId(id);
      await reviewerApi.deleteInvitation(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Xóa reviewer thất bại");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  


  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Quản lý Reviewer</h2>
            <p className="text-slate-500 mt-1">
              Chỉ hiển thị reviewer đã chấp nhận và có tài khoản (đã gộp theo email)
            </p>
          </div>

          <button
            onClick={() => setOpenInvite(true)}
            className="flex items-center gap-2 px-6 h-12 bg-rose-600 text-white rounded-xl font-bold shadow hover:opacity-95"
          >
            <span className="material-symbols-outlined">person_add</span>
            Mời Reviewer
          </button>
        </div>

       
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <p className="text-sm text-slate-500">Tổng lời mời</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{total}</h3>
          </div>

         
          <div className="bg-green-50 rounded-2xl border border-green-100 p-6">
            <p className="text-sm text-green-700">Đã chấp nhận</p>
            <h3 className="text-3xl font-black text-green-800 mt-2">{accepted}</h3>
          </div>

         
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
            <p className="text-sm text-amber-700">Chờ phản hồi</p>
            <h3 className="text-3xl font-black text-amber-800 mt-2">{pending}</h3>
          </div>

          
          <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
            <p className="text-sm text-red-700">Từ chối</p>
            <h3 className="text-3xl font-black text-red-800 mt-2">{declined}</h3>
          </div>
        </div>

        
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <Th>Họ Tên Reviewer</Th>
                <Th>Email</Th>
                <Th>Đơn vị công tác</Th>
                <Th>Lĩnh vực chuyên môn</Th>
                <Th className="text-center">Tổng số bài</Th>
                <Th className="text-center">Trạng thái</Th>
                <Th className="text-center">Hành động</Th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    Chưa có reviewer nào đã chấp nhận (và có tài khoản)
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => {
                  const st = statusMap[r.status] || statusMap.PENDING;
                  const isDeleting = deletingId === r.id;
                  const acc = r.account;

                  const affiliation = pickAffiliation(acc);
                  const interests = pickInterests(acc);

                  return (
                    <tr key={r.id} className={`transition ${isDeleting ? "opacity-50" : "hover:bg-slate-50"}`}>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {acc?.full_name || acc?.name || r.reviewer_name || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {acc?.email || r.reviewer_email || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">{affiliation}</td>

                      <td className="px-6 py-4">
                        {interests.length ? (
                          <div className="flex flex-wrap gap-1">
                            {interests.slice(0, 6).map((tag, idx) => (
                              <span
                                key={`${r.id}-tag-${idx}`}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                          {r.total_assigned_papers ?? 0}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>
                          {st.text}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            title="Xem hồ sơ"
                            onClick={() => navigate(`/chair/reviewers/${acc.id}`)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                          >
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>

                          <button
                            title="Xóa khỏi danh sách"
                            disabled={isDeleting}
                            onClick={() => handleDelete(r.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InviteReviewerModal open={openInvite} onClose={() => setOpenInvite(false)} onSuccess={fetchData} />
    </div>
  );
}



function Th({ children, className = "" }) {
  return (
    <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}
