import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";

const TYPES = [
  {
    value: "Manual_Declared",
    title: "Khai báo thủ công",
    desc: "Bạn chủ động khai báo xung đột lợi ích",
  },
  {
    value: "Detected_Organization",
    title: "Cùng cơ quan / tổ chức",
    desc: "Có liên quan theo cơ quan công tác / tổ chức",
  },
  {
    value: "Other",
    title: "Khác",
    desc: "Lý do cá nhân hoặc nghề nghiệp khác",
  },
];

export default function COINew() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [cois, setCois] = useState([]);

  const [paperId, setPaperId] = useState("");
  const [type, setType] = useState("Manual_Declared");
  const [description, setDescription] = useState("");

  const load = async () => {
    if (!user) return;

    setLoading(true);
    setErr("");
    try {
      const [assRes, coiRes] = await Promise.all([
        reviewApi.listAssignments({ reviewerId: user.id }),
        reviewApi.listMyCOI(),
      ]);

      const assList = Array.isArray(assRes) ? assRes : (assRes?.data || []);
      const coiList = Array.isArray(coiRes) ? coiRes : (coiRes?.data || []);

      setAssignments(assList);
      setCois(coiList);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const paperOptions = useMemo(() => {
    // 1. Lấy danh sách Paper ID đã khai báo COI rồi (để loại trừ)
    const existing = new Set((cois || []).map((x) => Number(x.paper_id)));
    
    return (assignments || [])
      .filter((a) => {
         const st = (a.status || "").toLowerCase();
         // LOGIC MỚI: Ẩn các bài đã Completed, Declined VÀ Accepted
         // (Chỉ hiện bài Invited hoặc bài chưa tương tác)
         return st !== "completed" && st !== "declined" && st !== "accepted"; 
      })
      .filter((a) => !existing.has(Number(a.paper_id))) // Loại trừ bài đã có COI
      .map((a) => ({ 
          paper_id: a.paper_id, 
          assignment_id: a.id,
          title: a.paper_title || a.title || `Paper #${a.paper_id}`
      }));
  }, [assignments, cois]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!paperId) {
      setErr("Vui lòng chọn bài báo");
      return;
    }

    try {
      await reviewApi.declareCOI({
        paper_id: Number(paperId),
        reviewer_id: user.id,
        type,
        description: description || null,
      });

      navigate("/reviewer/coi");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Khai báo COI thất bại");
    }
  };

  return (
    <div className="max-w-[960px] mx-auto py-6 px-4">
      <header className="mb-8">
        <h2 className="text-[#0d141b] text-3xl font-black tracking-tight mb-2">
          Khai báo Xung đột lợi ích mới
        </h2>
        <p className="text-[#4c739a] text-base leading-relaxed max-w-2xl">
          Vui lòng cung cấp thông tin chính xác về các mối quan hệ có thể ảnh hưởng đến tính khách quan.
        </p>
      </header>

      {err ? (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm font-bold text-rose-700">{err}</p>
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={submit} className="p-8 flex flex-col gap-8">
          {/* Paper */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <label className="text-[#0d141b] text-sm font-bold">Chọn Bài báo <span className="text-rose-500">*</span></label>
            <select
              value={paperId}
              onChange={(e) => setPaperId(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
            >
              <option value="">-- Chọn bài báo cần khai báo --</option>
              {paperOptions.length === 0 && !loading && (
                  <option disabled>Không có bài báo nào (chỉ hiển thị bài Invited)</option>
              )}
              {paperOptions.map((x) => (
                <option key={x.assignment_id} value={x.paper_id}>
                  {x.title} (ID: {x.paper_id})
                </option>
              ))}
            </select>
            <p className="text-xs text-[#4c739a]">
              Chỉ hiển thị các bài chưa nhận (Accepted), chưa hoàn thành và chưa khai báo COI.
            </p>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-4">
            <label className="text-[#0d141b] text-sm font-bold">Loại xung đột</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TYPES.map((t) => (
                <label
                  key={t.value}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    className="h-5 w-5 text-primary border-slate-200 focus:ring-primary/20"
                    name="coi_type"
                    type="radio"
                    checked={type === t.value}
                    onChange={() => setType(t.value)}
                  />
                  <div className="flex flex-col">
                    <span className="text-[#0d141b] text-sm font-semibold">{t.title}</span>
                    <span className="text-[#4c739a] text-xs">{t.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-[#0d141b] text-sm font-bold">Mô tả chi tiết</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[120px] p-4 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none resize-none"
              placeholder="Giải thích thêm về mối quan hệ hoặc tình huống xung đột..."
            />
          </div>

          {/* Alert */}
          <div className="flex gap-4 items-start p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="material-symbols-outlined text-amber-600 mt-0.5">
              error
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-amber-800 text-sm font-bold leading-none">
                Lưu ý quan trọng
              </p>
              <p className="text-amber-700 text-sm leading-snug">
                Khai báo COI sẽ <strong className="underline">tự động Từ chối (Declined)</strong>{" "}
                lời mời chấm bài liên quan.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              className="px-6 py-2.5 rounded-lg border border-slate-200 text-[#4c739a] text-sm font-semibold hover:bg-slate-50 transition-colors"
              type="button"
              onClick={() => navigate("/reviewer/coi")}
            >
              Hủy
            </button>
            <button
              className="px-8 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                 "Đang xử lý..."
              ) : (
                 <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Xác nhận khai báo
                 </>
              )}
            </button>
          </div>
        </form>
      </div>

      <footer className="mt-8 text-center">
        <p className="text-xs text-[#4c739a]">
          Bản quyền © 2026 UTH. Mọi quyền được bảo lưu.
        </p>
      </footer>
    </div>
  );
}