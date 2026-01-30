import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewerApi from "../../api/reviewerApi";
import InviteReviewerModal from "./InviteReviewerModal";

/* -------- helpers -------- */

const statusMap = {
  ACCEPTED: {
    text: "Đã chấp nhận",
    cls: "bg-green-100 text-green-700",
  },
  PENDING: {
    text: "Chờ phản hồi",
    cls: "bg-amber-100 text-amber-700",
  },
  DECLINED: {
    text: "Từ chối",
    cls: "bg-red-100 text-red-700",
  },
};

/* -------- page -------- */

export default function ReviewerManagementPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [openInvite, setOpenInvite] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await reviewerApi.getInvitations();
      setItems(Array.isArray(res) ? res : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* -------- delete -------- */
  const handleDelete = async (id) => {
    const ok = window.confirm(
      "Bạn có chắc muốn xóa reviewer này khỏi hội nghị?"
    );
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

const total = items.length;
const accepted = items.filter(i => i.status === "ACCEPTED").length;
const pending = items.filter(i => i.status === "PENDING").length;
const declined = items.filter(i => i.status === "DECLINED").length;


  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">
              Quản lý Reviewer
            </h2>
            <p className="text-slate-500 mt-1">
              Danh sách chuyên gia phản biện của hội nghị
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

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tổng reviewer */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <p className="text-sm text-slate-500">Tổng Reviewer</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{total}</h3>
          </div>

          {/* Đã chấp nhận */}
          <div className="bg-green-50 rounded-2xl border border-green-100 p-6">
            <p className="text-sm text-green-700">Đã chấp nhận</p>
            <h3 className="text-3xl font-black text-green-800 mt-2">
              {accepted}
            </h3>
          </div>

          {/* Chờ phản hồi */}
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
            <p className="text-sm text-amber-700">Chờ phản hồi</p>
            <h3 className="text-3xl font-black text-amber-800 mt-2">
              {pending}
            </h3>
          </div>

          {/* Từ chối */}
          <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
            <p className="text-sm text-red-700">Từ chối</p>
            <h3 className="text-3xl font-black text-red-800 mt-2">
              {declined}
            </h3>
          </div>
        </div>


        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <Th>Họ Tên Reviewer</Th>
                <Th>Email</Th>
                <Th>Hội nghị</Th>
                <Th>Lĩnh Vực</Th>
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
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    Chưa có reviewer nào
                  </td>
                </tr>
              ) : (
                items.map((r) => {
                  const st = statusMap[r.status] || statusMap.PENDING;
                  const isDeleting = deletingId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className={`transition ${
                        isDeleting ? "opacity-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {r.reviewer_name}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {r.reviewer_email}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {r.conference_name}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {r.field_name || "—"}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                          {r.total_assigned_papers ?? 0}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold ${st.cls}`}
                        >
                          {st.text}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            title="Xem hồ sơ"
                            onClick={() =>
                              navigate(`/chair/reviewers/${r.reviewer_id}`)
                            }
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              visibility
                            </span>
                          </button>

                          <button
                            title="Xóa khỏi danh sách"
                            disabled={isDeleting}
                            onClick={() => handleDelete(r.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              delete
                            </span>
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

      {/* Invite modal */}
      <InviteReviewerModal
        open={openInvite}
        onClose={() => setOpenInvite(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

/* -------- small components -------- */

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}
