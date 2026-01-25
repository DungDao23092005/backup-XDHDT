import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitPaper } from "../../api/submissionApi";


const MAX_MB = 20;

export default function SubmitPaper() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // --- metadata state ---
  const [conferenceId, setConferenceId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [blindMode, setBlindMode] = useState(false);

  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState("");

  const [authors, setAuthors] = useState([
    { full_name: "", email: "", organization: "", is_corresponding: true },
  ]);

  const [topics, setTopics] = useState([]); // array of topic_id or strings
  const [file, setFile] = useState(null);

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const progressPct = useMemo(() => (step - 1) / 3, [step]);

  const canNext = useMemo(() => {
    if (step === 1) {
      return conferenceId && trackId && title.trim() && abstract.trim() && keywords.length > 0;
    }
    if (step === 2) {
      const ok = authors.length > 0 && authors.every(a => a.full_name.trim() && a.email.trim());
      const hasCorresponding = authors.some(a => a.is_corresponding);
      return ok && hasCorresponding;
    }
    if (step === 3) return topics.length >= 1;
    if (step === 4) return !!file && agree;
    return false;
  }, [step, conferenceId, trackId, title, abstract, keywords, authors, topics, file, agree]);

  const addKeyword = () => {
    const v = kwInput.trim();
    if (!v) return;
    if (keywords.map(k => k.toLowerCase()).includes(v.toLowerCase())) return;
    setKeywords([...keywords, v]);
    setKwInput("");
  };

  const removeKeyword = (k) => setKeywords(keywords.filter(x => x !== k));

  const addAuthorRow = () => {
    setAuthors([...authors, { full_name: "", email: "", organization: "", is_corresponding: false }]);
  };

  const updateAuthor = (idx, patch) => {
    setAuthors(prev => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const setCorresponding = (idx) => {
    setAuthors(prev => prev.map((a, i) => ({ ...a, is_corresponding: i === idx })));
  };

  const removeAuthor = (idx) => {
    if (idx === 0) return; // giữ tác giả chính
    setAuthors(prev => prev.filter((_, i) => i !== idx));
  };

  const onPickFile = (f) => {
    setError("");
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setError("Chỉ chấp nhận file PDF.");
    const mb = f.size / (1024 * 1024);
    if (mb > MAX_MB) return setError(`File vượt quá ${MAX_MB}MB.`);
    setFile(f);
  };

  const submit = async () => {
    try {
      setError("");
      setSubmitting(true);

      const metadata = {
        conference_id: Number(conferenceId),
        track_id: Number(trackId),
        title,
        abstract,
        keywords,
        is_blind_mode: blindMode,
        authors: authors.map(a => ({
          full_name: a.full_name,
          email: a.email,
          organization: a.organization,
          is_corresponding: !!a.is_corresponding,
        })),
        topics: topics.map(t => ({ topic_id: Number(t) })), // nếu backend bạn cần dạng này
      };

      await submitPaper({ metadata, file });

      navigate("/author/submissions");
    } catch (e) {
      setError(e?.response?.data?.detail || "Nộp bài thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">Nộp bài báo mới</h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
            Hệ thống mở
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 md:p-8 pb-28">
        {/* Error */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 font-semibold">
            {error}
          </div>
        )}

        {/* Stepper */}
        <div className="relative mt-2">
          <div className="absolute top-5 left-0 right-0 h-1 bg-slate-200 rounded-full" />
          <div
            className="absolute top-5 left-0 h-1 bg-rose-500 rounded-full"
            style={{ width: `${progressPct * 100}%` }}
          />
          <div className="grid grid-cols-4 gap-2">
            <StepDot n={1} step={step} label="Thông tin chung" />
            <StepDot n={2} step={step} label="Tác giả" />
            <StepDot n={3} step={step} label="Chủ đề" />
            <StepDot n={4} step={step} label="Tải lên file" />
          </div>
        </div>

        {/* Content */}
        <div className="mt-10 space-y-6">
          {step === 1 && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">1. Thông tin chung</h3>
              </div>

              <div className="p-6 grid gap-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Hội nghị <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border-slate-300 bg-white focus:border-rose-500 focus:ring-rose-500"
                      placeholder="VD: 1"
                      value={conferenceId}
                      onChange={(e) => setConferenceId(e.target.value)}
                    />
                    <div className="text-xs text-slate-400">
                      (Tạm thời nhập ID. Sau bạn nối API conferences để select)
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Track <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border-slate-300 bg-white focus:border-rose-500 focus:ring-rose-500"
                      placeholder="VD: 2"
                      value={trackId}
                      onChange={(e) => setTrackId(e.target.value)}
                    />
                    <div className="text-xs text-slate-400">
                      (Bạn có endpoint /tracks, sau mình đổi thành select)
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Tiêu đề <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề bài báo..."
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 flex justify-between">
                    <span>
                      Tóm tắt <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-xs text-slate-400">Tối đa 300 từ</span>
                  </label>
                  <textarea
                    className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500 p-4 resize-none"
                    rows={5}
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    placeholder="Nhập tóm tắt..."
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Từ khóa <span className="text-rose-500">*</span>
                  </label>

                  <div className="w-full rounded-lg border border-slate-300 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 p-2 flex flex-wrap gap-2 bg-white">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="bg-rose-50 text-rose-700 px-2 py-1 rounded text-sm font-semibold flex items-center gap-2 border border-rose-100"
                      >
                        {k}
                        <button onClick={() => removeKeyword(k)} className="text-rose-500 hover:text-rose-700">
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      className="flex-1 outline-none min-w-[180px] bg-transparent py-1 px-1 text-sm"
                      placeholder="Nhập từ khóa và nhấn Enter..."
                      value={kwInput}
                      onChange={(e) => setKwInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addKeyword}
                      className="px-3 py-1 rounded-lg bg-rose-500 text-white font-bold text-sm"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                    type="checkbox"
                    checked={blindMode}
                    onChange={(e) => setBlindMode(e.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-800">Bật chế độ ẩn danh (Blind Mode)</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Khi bật, thông tin tác giả sẽ được ẩn khỏi file PDF khi gửi cho người phản biện.
                    </div>
                  </div>
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-800">2. Tác giả & Đồng tác giả</h3>
                <button
                  onClick={addAuthorRow}
                  className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 font-bold hover:bg-rose-50"
                >
                  + Thêm tác giả
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase text-slate-500 font-bold">
                      <th className="px-6 py-3 w-12">#</th>
                      <th className="px-6 py-3">Họ và tên</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Tổ chức</th>
                      <th className="px-6 py-3 text-center">Liên hệ</th>
                      <th className="px-6 py-3 text-right">Xóa</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {authors.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <input
                            className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                            value={a.full_name}
                            onChange={(e) => updateAuthor(idx, { full_name: e.target.value })}
                            placeholder="Họ tên"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                            value={a.email}
                            onChange={(e) => updateAuthor(idx, { email: e.target.value })}
                            placeholder="Email"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                            value={a.organization}
                            onChange={(e) => updateAuthor(idx, { organization: e.target.value })}
                            placeholder="Tổ chức"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="radio"
                            name="corresponding"
                            checked={!!a.is_corresponding}
                            onChange={() => setCorresponding(idx)}
                            className="w-5 h-5 text-rose-500 focus:ring-rose-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            disabled={idx === 0}
                            onClick={() => removeAuthor(idx)}
                            className={`px-3 py-2 rounded-lg ${
                              idx === 0
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-rose-600 hover:bg-rose-50"
                            }`}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-rose-50 border-t border-rose-100 text-xs text-rose-800">
                <b>Lưu ý:</b> Tác giả liên hệ sẽ nhận thông báo phản biện và trao đổi với Ban tổ chức.
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">3. Chủ đề (Topics)</h3>
                <p className="text-sm text-slate-500 mt-1">Chọn ít nhất 01 chủ đề.</p>
              </div>

              <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: 1, name: "Artificial Intelligence" },
                  { id: 2, name: "Machine Learning" },
                  { id: 3, name: "Computer Vision" },
                  { id: 4, name: "Big Data Analytics" },
                  { id: 5, name: "Smart City Applications" },
                ].map((t) => {
                  const checked = topics.includes(String(t.id));
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        checked
                          ? "border-rose-400 bg-rose-50"
                          : "border-slate-200 hover:border-rose-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-rose-500 focus:ring-rose-500"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setTopics([...topics, String(t.id)]);
                          else setTopics(topics.filter((x) => x !== String(t.id)));
                        }}
                      />
                      <span className={`text-sm ${checked ? "font-bold text-rose-700" : "text-slate-700"}`}>
                        {t.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">4. Tải lên tập tin</h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50/40 p-8 text-center">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    id="pdf"
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                  <label htmlFor="pdf" className="cursor-pointer">
                    <div className="text-3xl">☁️</div>
                    <div className="text-lg font-bold text-slate-800 mt-2">Kéo thả file PDF hoặc bấm để chọn</div>
                    <div className="text-sm text-slate-500 mt-1">Tối đa {MAX_MB}MB</div>
                    <div className="mt-4 inline-flex px-5 py-2 rounded-xl bg-white border border-slate-200 font-bold text-rose-600">
                      Chọn tập tin
                    </div>
                  </label>
                </div>

                {file && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 break-all">{file.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-bold"
                    >
                      Xóa
                    </button>
                  </div>
                )}

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5 text-rose-500 focus:ring-rose-500"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <div className="text-sm text-slate-600">
                    <div className="font-bold text-slate-900 mb-1">Cam kết tính nguyên bản và sở hữu trí tuệ</div>
                    Tôi cam kết bài báo là công trình gốc, chưa xuất bản và không đang xét duyệt nơi khác.
                  </div>
                </label>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-between px-6 lg:px-24 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => {
            const draft = {
              step,
              conferenceId,
              trackId,
              title,
              abstract,
              blindMode,
              keywords,
              authors,
              topics,
            };
            localStorage.setItem("author_submit_draft", JSON.stringify(draft));
          }}
          className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
        >
          💾 Lưu bản nháp
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 1 ? navigate(-1) : setStep(step - 1))}
            className="px-6 py-2.5 rounded-lg text-slate-600 font-bold hover:bg-slate-50"
          >
            Quay lại
          </button>

          {step < 4 ? (
            <button
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className={`px-8 py-2.5 rounded-lg font-black flex items-center gap-2 ${
                canNext
                  ? "bg-rose-500 text-white hover:opacity-95"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Tiếp tục →
            </button>
          ) : (
            <button
              disabled={!canNext || submitting}
              onClick={submit}
              className={`px-8 py-2.5 rounded-lg font-black flex items-center gap-2 ${
                canNext && !submitting
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Đang gửi..." : "📨 Gửi bài báo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, step, label }) {
  const done = step > n;
  const active = step === n;

  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        className={[
          "w-10 h-10 rounded-full flex items-center justify-center font-black ring-4",
          done || active
            ? "bg-rose-500 text-white ring-white"
            : "bg-white border-2 border-slate-300 text-slate-400 ring-white",
          active ? "ring-rose-100" : "",
        ].join(" ")}
      >
        {done ? "✓" : n}
      </div>
      <div
        className={[
          "text-xs text-center w-28",
          done || active ? "font-bold text-rose-600" : "font-medium text-slate-400",
        ].join(" ")}
      >
        {label}
      </div>
    </div>
  );
}
