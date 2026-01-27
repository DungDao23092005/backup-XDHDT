import React from "react";

const CRITERIA_LIST = [
  {
    key: "novelty",
    label: "1. Novelty & Significance",
    desc: "Tính mới mẻ của ý tưởng và tầm quan trọng của đóng góp.",
  },
  {
    key: "methodology",
    label: "2. Methodology & Technical Depth",
    desc: "Phương pháp nghiên cứu có đúng đắn, kỹ thuật có sâu sắc không?",
  },
  {
    key: "presentation",
    label: "3. Presentation & Clarity",
    desc: "Trình bày có rõ ràng, dễ hiểu, cấu trúc hợp lý không?",
  },
];

const ReviewForm = ({ form, onCriteriaChange, onFieldChange }) => {
  
  // --- FIX: Sử dụng prop onCriteriaChange thay vì setForm ---
  const setCriteriaGrade = (key, val) => {
    onCriteriaChange(key, "grade", val);
  };

  const setCriteriaComment = (key, val) => {
    onCriteriaChange(key, "comment", val);
  };
  // ---------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* 1. CRITERIA SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">grading</span>
          Tiêu chí đánh giá
        </h3>

        <div className="space-y-8">
          {CRITERIA_LIST.map((c) => {
            const data = form.criterias[c.key] || { grade: 0, comment: "" };
            return (
              <div key={c.key} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{c.label}</h4>
                    <p className="text-sm text-slate-500 mt-1">{c.desc}</p>
                  </div>
                  
                  {/* Score Buttons */}
                  <div className="flex bg-slate-100 rounded-lg p-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const isSelected = data.grade === s;
                      let colorClass = "text-slate-500 hover:bg-white hover:shadow-sm";
                      if (isSelected) {
                        if (s <= 2) colorClass = "bg-rose-500 text-white shadow-md";
                        else if (s === 3) colorClass = "bg-amber-500 text-white shadow-md";
                        else colorClass = "bg-emerald-500 text-white shadow-md";
                      }

                      return (
                        <button
                          key={s}
                          onClick={() => setCriteriaGrade(c.key, s)}
                          className={`w-10 h-10 rounded-md font-bold text-sm transition-all duration-200 ${colorClass}`}
                          title={`Cho điểm ${s}/5`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Textarea */}
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                  rows={2}
                  placeholder={`Nhập nhận xét chi tiết cho tiêu chí "${c.label}"...`}
                  value={data.comment}
                  onChange={(e) => setCriteriaComment(c.key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. GENERAL COMMENTS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">comment</span>
          Nhận xét tổng quát
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Author Content */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Gửi tác giả (For Author) <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Nhận xét chung, điểm mạnh, điểm yếu..."
              value={form.content_author}
              onChange={(e) => onFieldChange("content_author", e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              Tác giả sẽ nhìn thấy nội dung này.
            </p>
          </div>

          {/* PC Content */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Gửi Ban tổ chức (For PC Only)
            </label>
            <textarea
              className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Nội dung bảo mật (nghi ngờ đạo văn, xung đột lợi ích tiềm ẩn...)"
              value={form.content_pc}
              onChange={(e) => onFieldChange("content_pc", e.target.value)}
            />
            <div className="flex items-center justify-end gap-1 mt-1 text-xs text-amber-600 font-bold">
              <span className="material-symbols-outlined text-sm">lock</span>
              Bảo mật
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUMMARY & SETTINGS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">fact_check</span>
          Tổng kết
        </h3>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Total Score Display */}
          <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-200">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Tổng điểm
            </span>
            <span className={`text-4xl font-black ${
                form.final_score >= 4 ? "text-emerald-500" :
                form.final_score >= 2.5 ? "text-amber-500" : "text-rose-500"
            }`}>
              {form.final_score}
            </span>
            <span className="text-sm font-bold text-slate-400">/ 5.0</span>
          </div>

          {/* Confidence Score */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <label className="text-sm font-bold text-slate-700">Độ tự tin của bạn (Confidence)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => onFieldChange("confidence_score", v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    form.confidence_score === v
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              (1: Thấp ... 5: Chuyên gia)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm;