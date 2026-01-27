import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { submitPaper } from "../../api/submissionApi";
import conferenceApi from "../../api/conferenceApi";


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

  // topics state sẽ lưu LIST ID dạng string/number đều được, mình normalize qua Number khi submit
  const [topics, setTopics] = useState([]);
  const [file, setFile] = useState(null);

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ====== NEW: data sources ======
  const [conferences, setConferences] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);

  const [loadingConf, setLoadingConf] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);


  // 1) load conferences
  useEffect(() => {
    (async () => {
      try {
        setLoadingConf(true);
        setError("");
        const data = await conferenceApi.getAllConferences();
        const arr = Array.isArray(data) ? data : data?.items || [];
        setConferences(arr);
      } catch (e) {
        setError(e?.response?.data?.detail || "Không tải được danh sách hội nghị.");
      } finally {
        setLoadingConf(false);
      }
    })();
  }, []);

  // 2) load tracks when conference changes
  useEffect(() => {
    if (!conferenceId) {
      setTracks([]);
      setTrackId("");
      setTopicOptions([]);
      setTopics([]);
      return;
    }

    (async () => {
      try {
        setLoadingTracks(true);
        setError("");

        // reset downstream
        setTrackId("");
        setTopicOptions([]);
        setTopics([]);

        const data = await conferenceApi.getTracksByConference(conferenceId);
        const arr = Array.isArray(data) ? data : data?.items || [];
        setTracks(arr);
      } catch (e) {
        setError(e?.response?.data?.detail || "Không tải được track theo hội nghị.");
        setTracks([]);
      } finally {
        setLoadingTracks(false);
      }
    })();
  }, [conferenceId]);

  // 3) ✅ load topics when track changes
  useEffect(() => {
    if (!trackId) {
      setTopicOptions([]);
      setTopics([]);
      return;
    }

    (async () => {
      try {
        setLoadingTopics(true);
        setError("");

        setTopics([]);
        const data = await conferenceApi.getTopicsByTrack(trackId); // ✅ /topics/track/{track_id}
        const arr = Array.isArray(data) ? data : data?.items || [];
        setTopicOptions(arr);
      } catch (e) {
        setError(e?.response?.data?.detail || "Không tải được topics theo track.");
        setTopicOptions([]);
      } finally {
        setLoadingTopics(false);
      }
    })();
  }, [trackId]);

  useEffect(() => {
  try {
    const raw = localStorage.getItem("author_submit_draft");
    if (!raw) return;

    const d = JSON.parse(raw);

    setStep(d.step || 1);
    setConferenceId(d.conferenceId || "");
    setTrackId(d.trackId || "");
    setTitle(d.title || "");
    setAbstract(d.abstract || "");
    setBlindMode(!!d.blindMode);
    setKeywords(Array.isArray(d.keywords) ? d.keywords : []);
    setAuthors(Array.isArray(d.authors) && d.authors.length ? d.authors : [{ full_name: "", email: "", organization: "", is_corresponding: true }]);
    setTopics(Array.isArray(d.topics) ? d.topics : []);
  } catch {
  }
}, []);


  const progressPct = useMemo(() => (step - 1) / 3, [step]);

  const canNext = useMemo(() => {
    if (step === 1) {
      return (
        conferenceId &&
        trackId &&
        title.trim() &&
        abstract.trim() &&
        keywords.length > 0
      );
    }
    if (step === 2) {
      const ok =
        authors.length > 0 &&
        authors.every((a) => a.full_name.trim() && a.email.trim());
      const hasCorresponding = authors.some((a) => a.is_corresponding);
      return ok && hasCorresponding;
    }
    if (step === 3) return topics.length >= 1;
    if (step === 4) return !!file && agree;
    return false;
  }, [step, conferenceId, trackId, title, abstract, keywords, authors, topics, file, agree]);

  const addKeyword = () => {
    const v = kwInput.trim();
    if (!v) return;
    if (keywords.map((k) => k.toLowerCase()).includes(v.toLowerCase())) return;
    setKeywords([...keywords, v]);
    setKwInput("");
  };

  const removeKeyword = (k) => setKeywords(keywords.filter((x) => x !== k));

  const addAuthorRow = () => {
    setAuthors([
      ...authors,
      { full_name: "", email: "", organization: "", is_corresponding: false },
    ]);
  };

  const updateAuthor = (idx, patch) => {
    setAuthors((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const setCorresponding = (idx) => {
    setAuthors((prev) =>
      prev.map((a, i) => ({ ...a, is_corresponding: i === idx }))
    );
  };

  const removeAuthor = (idx) => {
    if (idx === 0) return; // giữ tác giả chính
    setAuthors((prev) => prev.filter((_, i) => i !== idx));
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
        authors: authors.map((a) => ({
          full_name: a.full_name,
          email: a.email,
          organization: a.organization,
          is_corresponding: !!a.is_corresponding,
        })),
        topics: topics.map((t) => ({ topic_id: Number(t) })),
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
                  {/* Conference */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Hội nghị <span className="text-rose-500">*</span>
                    </label>

                    <select
                      className="w-full rounded-lg border-slate-300 bg-white focus:border-rose-500 focus:ring-rose-500"
                      value={conferenceId}
                      onChange={(e) => setConferenceId(e.target.value)}
                      disabled={loadingConf}
                    >
                      <option value="">{loadingConf ? "Đang tải hội nghị..." : "Chọn hội nghị..."}</option>
                      {conferences.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.title || `Conference #${c.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Track */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Track <span className="text-rose-500">*</span>
                    </label>

                    <select
                      className="w-full rounded-lg border-slate-300 bg-white focus:border-rose-500 focus:ring-rose-500"
                      value={trackId}
                      onChange={(e) => setTrackId(e.target.value)}
                      disabled={!conferenceId || loadingTracks}
                    >
                      <option value="">
                        {!conferenceId
                          ? "Chọn hội nghị trước..."
                          : loadingTracks
                          ? "Đang tải track..."
                          : "Chọn track..."}
                      </option>
                      {tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || t.title || `Track #${t.id}`}
                        </option>
                      ))}
                    </select>
                  </div>


                </div>

                {/* Title */}
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

                {/* Abstract */}
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

                {/* Keywords */}
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

                {/* Blind mode */}
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

          {/* Step 2 giữ nguyên như bạn */}
          {step === 2 && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">2. Tác giả</h3>
                <p className="text-sm text-slate-500 mt-1">Nhập ít nhất 1 tác giả. Chọn 1 tác giả liên hệ.</p>
              </div>

              <div className="p-6 space-y-4">
                {authors.map((a, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-slate-700">Họ tên *</label>
                        <input
                          className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                          value={a.full_name}
                          onChange={(e) => updateAuthor(idx, { full_name: e.target.value })}
                          placeholder="Nguyễn Văn A"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-700">Email *</label>
                        <input
                          className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                          value={a.email}
                          onChange={(e) => updateAuthor(idx, { email: e.target.value })}
                          placeholder="a@email.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Tổ chức</label>
                        <input
                          className="w-full rounded-lg border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                          value={a.organization}
                          onChange={(e) => updateAuthor(idx, { organization: e.target.value })}
                          placeholder="Trường/Viện..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="corresponding"
                          checked={!!a.is_corresponding}
                          onChange={() => setCorresponding(idx)}
                        />
                        Tác giả liên hệ
                      </label>

                      <button
                        type="button"
                        onClick={() => removeAuthor(idx)}
                        disabled={idx === 0}
                        className={`px-3 py-2 rounded-lg font-bold ${
                          idx === 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAuthorRow}
                  className="px-4 py-2 rounded-lg bg-rose-500 text-white font-bold"
                >
                  + Thêm tác giả
                </button>
              </div>
            </section>
          )}


          {step === 3 && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">3. Chủ đề (Topics)</h3>
                <p className="text-sm text-slate-500 mt-1">Chọn ít nhất 01 chủ đề.</p>
              </div>

              <div className="p-6">
                {!trackId ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                    Bạn chưa chọn <b>Track</b>. Quay lại bước 1 để chọn Track.
                  </div>
                ) : loadingTopics ? (
                  <div className="text-slate-500 font-semibold">Đang tải Topics...</div>
                ) : topicOptions.length === 0 ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                    Track này chưa có Topics.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topicOptions.map((t) => {
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
                            {t.name || t.title || `Topic #${t.id}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Step 4 giữ nguyên như bạn */}
          {step === 4 && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">4. Tải lên tập tin</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Chỉ chấp nhận PDF. Tối đa <b>{MAX_MB}MB</b>.
                  </p>
                </div>

                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700">
                  Bước cuối
                </span>
              </div>

              <div className="p-6 space-y-5">
                {/* Dropzone */}
                <div className="border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50/40 p-8 text-center hover:bg-rose-50 transition">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    id="pdf"
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />

                  <label htmlFor="pdf" className="cursor-pointer block">
                    <div className="mx-auto w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                      <span className="text-2xl">☁️</span>
                    </div>

                    <div className="text-lg font-black text-slate-800 mt-3">
                      Kéo thả file PDF vào đây
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      hoặc bấm để duyệt file từ máy tính
                    </div>

                    <div className="mt-4 inline-flex px-5 py-2 rounded-xl bg-white border border-slate-200 font-bold text-rose-600 hover:bg-rose-50">
                      Chọn tập tin
                    </div>

                    <div className="text-xs text-slate-400 mt-3">
                      Bạn có thể thay file bất cứ lúc nào trước khi gửi.
                    </div>
                  </label>
                </div>

                {/* File Preview */}
                {file && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
                        <span className="text-rose-600 text-xl">PDF</span>
                      </div>

                      <div className="flex flex-col">
                        <div className="font-bold text-slate-900 break-all">{file.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-green-600 font-bold">Sẵn sàng</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setFile(null)}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-black"
                    >
                      Xóa
                    </button>
                  </div>
                )}

                {/* Agreement */}
                <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5 text-rose-500 focus:ring-rose-500"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <div className="text-sm text-slate-600">
                    <div className="font-black text-slate-900 mb-1">
                      Cam kết tính nguyên bản và sở hữu trí tuệ
                    </div>
                    Tôi cam kết rằng bài báo là công trình nghiên cứu gốc, chưa từng được xuất bản và
                    không đang được xem xét tại hội nghị/tạp chí khác. Tôi chịu hoàn toàn trách nhiệm
                    về nội dung bài báo.
                  </div>
                </label>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Bottom bar giữ nguyên như bạn */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-between px-6 lg:px-24 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => {
            const draft = { step, conferenceId, trackId, title, abstract, blindMode, keywords, authors, topics };
            localStorage.setItem("author_submit_draft", JSON.stringify(draft));
            alert("Đã lưu bản nháp!");
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