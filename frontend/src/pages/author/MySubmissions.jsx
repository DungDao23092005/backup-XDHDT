import React, { useEffect, useState } from "react";
import { listMySubmissions } from "../../api/submissionApi";
import { useNavigate } from "react-router-dom";

export default function MySubmissions() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await listMySubmissions();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.detail || "Không tải được danh sách submissions.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Bài đã nộp</h1>
          <p className="text-sm text-slate-500">Danh sách bài bạn đã submit.</p>
        </div>
        <button
          onClick={() => navigate("/author/submissions/new")}
          className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
        >
          + Nộp bài
        </button>
      </div>

      {err && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 font-semibold">{err}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-slate-800">Danh sách</div>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Reload"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Tiêu đề</th>
                <th className="text-left p-3">Track</th>
                <th className="text-left p-3">Conference</th>
                <th className="text-left p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && !err && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Chưa có bài nào.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-600">#{p.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{p.title || "---"}</td>
                    <td className="p-3 text-slate-700">{p.track_id ?? "---"}</td>
                    <td className="p-3 text-slate-700">{p.conference_id ?? "---"}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {p.status || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
