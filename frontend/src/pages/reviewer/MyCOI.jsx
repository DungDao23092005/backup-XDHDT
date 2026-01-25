import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../api/reviewApi";

const badge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "open") {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        Open
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      Resolved
    </span>
  );
};

export default function MyCOI() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await reviewApi.listMyCOI();
      setItems(res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được COI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const computed = useMemo(() => {
    const all = items || [];
    const open = all.filter((x) => (x.status || "").toLowerCase() === "open");
    const resolved = all.filter((x) => (x.status || "").toLowerCase() === "resolved");

    const filtered = all.filter((x) => {
      const text = `${x.paper_id} ${x.type} ${x.description || ""} ${x.status}`.toLowerCase();
      return text.includes((q || "").toLowerCase());
    });

    return { all, open, resolved, filtered };
  }, [items, q]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-[#0d141b] text-4xl font-black tracking-tight">
            Khai báo Xung đột lợi ích (COI)
          </h2>
          <p className="text-[#4c739a] text-base">
            Quản lý và khai báo các trường hợp xung đột lợi ích.
          </p>
        </div>

        <button
          onClick={() => navigate("/reviewer/coi/new")}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Khai báo COI mới</span>
        </button>
      </div>

      {/* Warning */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-xl border border-slate-200 bg-white">
          <div className="flex gap-4">
            <div className="text-amber-500 flex-shrink-0">
              <span className="material-symbols-outlined text-4xl">info</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[#0d141b] text-lg font-bold">
                Lưu ý quan trọng về quy trình
              </p>
              <p className="text-[#4c739a] text-sm leading-relaxed">
                Khai báo COI sẽ tự động từ chối (Declined) mọi lời mời chấm bài liên quan.
              </p>
            </div>
          </div>

          <button className="flex items-center gap-2 text-primary font-bold hover:underline shrink-0">
            Xem quy định COI
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[#4c739a] text-sm font-medium mb-1">Tổng số COI đã khai báo</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-[#0d141b]">{computed.all.length}</h3>
            <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
              Tất cả
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[#4c739a] text-sm font-medium mb-1">Đang chờ xử lý (Open)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-amber-500">{computed.open.length}</h3>
            <span className="text-amber-500 bg-amber-50 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
              Pending
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[#4c739a] text-sm font-medium mb-1">Đã xử lý</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-emerald-500">{computed.resolved.length}</h3>
            <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
              Processed
            </span>
          </div>
        </div>
      </div>

      {err ? (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm font-bold text-rose-700">{err}</p>
        </div>
      ) : null}

      {/* Search + table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4c739a]">
                search
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Tìm kiếm theo Paper ID, Type, Lý do..."
                type="text"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all">
              <span className="material-symbols-outlined text-xl">filter_list</span>
              <span>Bộ lọc</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[#4c739a] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Paper</th>
                <th className="px-6 py-4 font-bold">Loại</th>
                <th className="px-6 py-4 font-bold">Mô tả</th>
                <th className="px-6 py-4 font-bold">Ngày khai báo</th>
                <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : computed.filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm text-slate-500">
                    Không có COI
                  </td>
                </tr>
              ) : (
                computed.filtered.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">#{x.paper_id}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-slate-100 rounded-full font-medium">
                        {x.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {x.description || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4c739a]">
                      {x.created_at ? new Date(x.created_at).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">{badge(x.status)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm text-[#4c739a]">
          <p>Hiển thị {Math.min(10, computed.filtered.length)} trên tổng {computed.filtered.length}</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-all">
              Trước
            </button>
            <button className="px-3 py-1 bg-primary text-white rounded font-bold">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-all">
              Sau
            </button>
          </div>
        </div>
      </div>

      <div className="text-center pb-12">
        <p className="text-[#4c739a] text-xs">
          © 2024 Trường Đại học Giao thông vận tải TP.HCM (UTH). Mọi quyền được bảo lưu.
        </p>
      </div>
    </div>
  );
}
