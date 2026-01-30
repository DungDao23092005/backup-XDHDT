// src/pages/author/SubmitPaper.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { submitPaper } from "../../api/submissionApi";
import conferenceApi from "../../api/conferenceApi";

const MAX_MB = 20;

const SoftBadge = ({ children }) => (
  <span
    className="px-3 py-1 rounded-full text-xs font-semibold border"
    style={{
      background: "rgb(var(--primary-rgb) / 0.10)",
      borderColor: "rgb(var(--primary-rgb) / 0.25)",
      color: "var(--primary)",
    }}
  >
    {children}
  </span>
);

function FieldLabel({ children, required }) {
  return (
    <label className="text-sm font-semibold" style={{ color: "var(--text)" }}>
      {children}{" "}
      {required ? <span style={{ color: "var(--primary)" }}>*</span> : null}
    </label>
  );
}

function InputBase(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-lg px-3 py-2 text-sm outline-none",
        props.className || "",
      ].join(" ")}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        ...(props.style || {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgb(var(--primary-rgb) / 0.55)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        props.onBlur?.(e);
      }}
    />
  );
}

function TextareaBase(props) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-lg px-3 py-2 text-sm outline-none",
        props.className || "",
      ].join(" ")}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        ...(props.style || {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgb(var(--primary-rgb) / 0.55)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        props.onBlur?.(e);
      }}
    />
  );
}

function SelectBase(props) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-lg px-3 py-2 text-sm outline-none",
        props.className || "",
      ].join(" ")}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        ...(props.style || {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgb(var(--primary-rgb) / 0.55)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        props.onBlur?.(e);
      }}
    />
  );
}

function PrimaryButton({ disabled, children, className = "", ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        "rounded-lg font-black transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      style={{
        background: disabled ? "rgb(148 163 184 / 0.25)" : "var(--primary)",
        color: disabled ? "rgb(148 163 184 / 0.9)" : "#fff",
        boxShadow: disabled ? "none" : "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, className = "", ...rest }) {
  return (
    <button
      {...rest}
      className={[
        "rounded-lg font-bold transition",
        className,
      ].join(" ")}
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

function SubtleButton({ children, className = "", ...rest }) {
  return (
    <button
      {...rest}
      className={["rounded-lg font-bold transition", className].join(" ")}
      style={{ color: "var(--text)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

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

  const [topics, setTopics] = useState([]); // list id string
  const [file, setFile] = useState(null);

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // data sources
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

  // 3) load topics when track changes
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
        const data = await conferenceApi.getTopicsByTrack(trackId);
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

  // restore draft
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
      setAuthors(
        Array.isArray(d.authors) && d.authors.length
          ? d.authors
          : [{ full_name: "", email: "", organization: "", is_corresponding: true }]
      );
      setTopics(Array.isArray(d.topics) ? d.topics : []);
    } catch {
      // ignore
    }
  }, []);

  const progressPct = useMemo(() => (step - 1) / 3, [step]);

  const canNext = useMemo(() => {
    if (step === 1) {
      return conferenceId && trackId && title.trim() && abstract.trim() && keywords.length > 0;
    }
    if (step === 2) {
      const ok = authors.length > 0 && authors.every((a) => a.full_name.trim() && a.email.trim());
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
    setAuthors([...authors, { full_name: "", email: "", organization: "", is_corresponding: false }]);
  };

  const updateAuthor = (idx, patch) => {
    setAuthors((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const setCorresponding = (idx) => {
    setAuthors((prev) => prev.map((a, i) => ({ ...a, is_corresponding: i === idx })));
  };

  const removeAuthor = (idx) => {
    if (idx === 0) return;
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

      // submit OK -> clear draft
      localStorage.removeItem("author_submit_draft");
      navigate("/author/submissions");
    } catch (e) {
      setError(e?.response?.data?.detail || "Nộp bài thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = () => {
    const draft = { step, conferenceId, trackId, title, abstract, blindMode, keywords, authors, topics };
    localStorage.setItem("author_submit_draft", JSON.stringify(draft));
    alert("Đã lưu bản nháp!");
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div
        className="h-16 border-b flex items-center justify-between px-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            Nộp bài báo mới
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <SoftBadge>Hệ thống mở</SoftBadge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 md:p-8 pb-28">
        {/* Error */}
        {error && (
          <div
            className="mb-6 rounded-xl p-4 font-semibold border"
            style={{
              background: "rgb(244 63 94 / 0.12)",
              borderColor: "rgb(244 63 94 / 0.25)",
              color: "rgb(244 63 94 / 0.95)",
            }}
          >
            {error}
          </div>
        )}

        {/* Stepper */}
        <div className="relative mt-2">
          <div
            className="absolute top-5 left-0 right-0 h-1 rounded-full"
            style={{ background: "rgb(var(--primary-rgb) / 0.15)" }}
          />
          <div
            className="absolute top-5 left-0 h-1 rounded-full"
            style={{ width: `${progressPct * 100}%`, background: "var(--primary)" }}
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
          {/* STEP 1 */}
          {step === 1 && (
            <section
              className="rounded-2xl border shadow-sm overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: "var(--border)", background: "rgb(var(--primary-rgb) / 0.04)" }}
              >
                <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                  1. Thông tin chung
                </h3>
              </div>

              <div className="p-6 grid gap-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Conference */}
                  <div className="flex flex-col gap-2">
                    <FieldLabel required>Hội nghị</FieldLabel>
                    <SelectBase
                      value={conferenceId}
                      onChange={(e) => setConferenceId(e.target.value)}
                      disabled={loadingConf}
                    >
                      <option value="">
                        {loadingConf ? "Đang tải hội nghị..." : "Chọn hội nghị..."}
                      </option>
                      {conferences.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.title || `Conference #${c.id}`}
                        </option>
                      ))}
                    </SelectBase>
                  </div>

                  {/* Track */}
                  <div className="flex flex-col gap-2">
                    <FieldLabel required>Track</FieldLabel>
                    <SelectBase
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
                    </SelectBase>
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-2">
                  <FieldLabel required>Tiêu đề</FieldLabel>
                  <InputBase
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề bài báo..."
                  />
                </div>

                {/* Abstract */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <FieldLabel required>Tóm tắt</FieldLabel>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Tối đa 300 từ
                    </span>
                  </div>
                  <TextareaBase
                    rows={5}
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    placeholder="Nhập tóm tắt..."
                    className="p-4 resize-none"
                  />
                </div>

                {/* Keywords */}
                <div className="flex flex-col gap-2">
                  <FieldLabel required>Từ khóa</FieldLabel>

                  <div
                    className="w-full rounded-lg p-2 flex flex-wrap gap-2"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="px-2 py-1 rounded text-sm font-semibold flex items-center gap-2 border"
                        style={{
                          background: "rgb(var(--primary-rgb) / 0.10)",
                          borderColor: "rgb(var(--primary-rgb) / 0.22)",
                          color: "var(--primary)",
                        }}
                      >
                        {k}
                        <button
                          type="button"
                          onClick={() => removeKeyword(k)}
                          className="font-black"
                          style={{ color: "var(--primary)" }}
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    <input
                      className="flex-1 outline-none min-w-[180px] bg-transparent py-1 px-1 text-sm"
                      style={{ color: "var(--text)" }}
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

                    <PrimaryButton type="button" onClick={addKeyword} className="px-3 py-1 text-sm">
                      Thêm
                    </PrimaryButton>
                  </div>
                </div>

                {/* Blind mode */}
                <label
                  className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer"
                  style={{ background: "rgb(var(--primary-rgb) / 0.04)", borderColor: "var(--border)" }}
                >
                  <input
                    className="w-5 h-5 mt-0.5 rounded"
                    type="checkbox"
                    checked={blindMode}
                    onChange={(e) => setBlindMode(e.target.checked)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <div>
                    <div className="text-sm font-bold" style={{ color: "var(--text)" }}>
                      Bật chế độ ẩn danh (Blind Mode)
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      Khi bật, thông tin tác giả sẽ được ẩn khỏi file PDF khi gửi cho người phản biện.
                    </div>
                  </div>
                </label>
              </div>
            </section>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <section
              className="rounded-2xl border shadow-sm overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: "var(--border)", background: "rgb(var(--primary-rgb) / 0.04)" }}
              >
                <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                  2. Tác giả
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Nhập ít nhất 1 tác giả. Chọn 1 tác giả liên hệ.
                </p>
              </div>

              <div className="p-6 space-y-4">
                {authors.map((a, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border space-y-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel required>Họ tên</FieldLabel>
                        <InputBase
                          value={a.full_name}
                          onChange={(e) => updateAuthor(idx, { full_name: e.target.value })}
                          placeholder="Nguyễn Văn A"
                        />
                      </div>

                      <div>
                        <FieldLabel required>Email</FieldLabel>
                        <InputBase
                          value={a.email}
                          onChange={(e) => updateAuthor(idx, { email: e.target.value })}
                          placeholder="a@email.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FieldLabel>Tổ chức</FieldLabel>
                        <InputBase
                          value={a.organization}
                          onChange={(e) => updateAuthor(idx, { organization: e.target.value })}
                          placeholder="Trường/Viện..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                        <input
                          type="radio"
                          name="corresponding"
                          checked={!!a.is_corresponding}
                          onChange={() => setCorresponding(idx)}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        Tác giả liên hệ
                      </label>

                      <button
                        type="button"
                        onClick={() => removeAuthor(idx)}
                        disabled={idx === 0}
                        className="px-3 py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: idx === 0 ? "rgb(148 163 184 / 0.20)" : "rgb(var(--primary-rgb) / 0.10)",
                          color: idx === 0 ? "rgb(148 163 184 / 0.9)" : "var(--primary)",
                          border: "1px solid " + (idx === 0 ? "transparent" : "rgb(var(--primary-rgb) / 0.22)"),
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}

                <PrimaryButton type="button" onClick={addAuthorRow} className="px-4 py-2">
                  + Thêm tác giả
                </PrimaryButton>
              </div>
            </section>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <section
              className="rounded-2xl border shadow-sm overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: "var(--border)", background: "rgb(var(--primary-rgb) / 0.04)" }}
              >
                <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                  3. Chủ đề (Topics)
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Chọn ít nhất 01 chủ đề.
                </p>
              </div>

              <div className="p-6">
                {!trackId ? (
                  <div
                    className="p-4 rounded-xl border"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    Bạn chưa chọn <b>Track</b>. Quay lại bước 1 để chọn Track.
                  </div>
                ) : loadingTopics ? (
                  <div className="font-semibold" style={{ color: "var(--muted)" }}>
                    Đang tải Topics...
                  </div>
                ) : topicOptions.length === 0 ? (
                  <div
                    className="p-4 rounded-xl border"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    Track này chưa có Topics.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topicOptions.map((t) => {
                      const checked = topics.includes(String(t.id));
                      return (
                        <label
                          key={t.id}
                          className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
                          style={{
                            borderColor: checked ? "rgb(var(--primary-rgb) / 0.45)" : "var(--border)",
                            background: checked ? "rgb(var(--primary-rgb) / 0.10)" : "var(--surface-2)",
                          }}
                          onMouseEnter={(e) => {
                            if (!checked) e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)";
                          }}
                          onMouseLeave={(e) => {
                            if (!checked) e.currentTarget.style.background = "var(--surface-2)";
                          }}
                        >
                          <input
                            type="checkbox"
                            className="w-5 h-5"
                            checked={checked}
                            style={{ accentColor: "var(--primary)" }}
                            onChange={(e) => {
                              if (e.target.checked) setTopics([...topics, String(t.id)]);
                              else setTopics(topics.filter((x) => x !== String(t.id)));
                            }}
                          />
                          <span
                            className="text-sm"
                            style={{
                              color: checked ? "var(--primary)" : "var(--text)",
                              fontWeight: checked ? 800 : 600,
                            }}
                          >
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

          {/* STEP 4 */}
          {step === 4 && (
            <section
              className="rounded-2xl border shadow-sm overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "var(--border)", background: "rgb(var(--primary-rgb) / 0.04)" }}
              >
                <div>
                  <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                    4. Tải lên tập tin
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                    Chỉ chấp nhận PDF. Tối đa <b>{MAX_MB}MB</b>.
                  </p>
                </div>

                <SoftBadge>Bước cuối</SoftBadge>
              </div>

              <div className="p-6 space-y-5">
                {/* Dropzone */}
                <div
                  className="border-2 border-dashed rounded-2xl p-8 text-center transition"
                  style={{
                    borderColor: "rgb(var(--primary-rgb) / 0.25)",
                    background: "rgb(var(--primary-rgb) / 0.06)",
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    id="pdf"
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />

                  <label htmlFor="pdf" className="cursor-pointer block">
                    <div
                      className="mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-sm border"
                      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                    >
                      <span className="text-2xl">☁️</span>
                    </div>

                    <div className="text-lg font-black mt-3" style={{ color: "var(--text)" }}>
                      Kéo thả file PDF vào đây
                    </div>
                    <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                      hoặc bấm để duyệt file từ máy tính
                    </div>

                    <div
                      className="mt-4 inline-flex px-5 py-2 rounded-xl font-bold border transition"
                      style={{
                        background: "var(--surface)",
                        borderColor: "rgb(var(--primary-rgb) / 0.25)",
                        color: "var(--primary)",
                      }}
                    >
                      Chọn tập tin
                    </div>

                    <div className="text-xs mt-3" style={{ color: "var(--muted)" }}>
                      Bạn có thể thay file bất cứ lúc nào trước khi gửi.
                    </div>
                  </label>
                </div>

                {/* File Preview */}
                {file && (
                  <div
                    className="rounded-2xl p-4 flex items-center justify-between shadow-sm border"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center border"
                        style={{
                          background: "rgb(var(--primary-rgb) / 0.10)",
                          borderColor: "rgb(var(--primary-rgb) / 0.22)",
                          color: "var(--primary)",
                        }}
                      >
                        <span className="font-black text-sm">PDF</span>
                      </div>

                      <div className="flex flex-col">
                        <div className="font-bold break-all" style={{ color: "var(--text)" }}>
                          {file.name}
                        </div>
                        <div className="text-xs mt-1 flex items-center gap-2" style={{ color: "var(--muted)" }}>
                          <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span className="w-1 h-1 rounded-full" style={{ background: "rgb(var(--primary-rgb) / 0.35)" }} />
                          <span className="font-bold" style={{ color: "var(--primary)" }}>
                            Sẵn sàng
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="px-3 py-2 rounded-xl font-black transition"
                      style={{ color: "var(--primary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.10)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      Xóa
                    </button>
                  </div>
                )}

                {/* Agreement */}
                <label
                  className="flex items-start gap-3 p-4 rounded-2xl border cursor-pointer"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                >
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    <div className="font-black mb-1" style={{ color: "var(--text)" }}>
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

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 h-20 border-t flex items-center justify-between px-6 lg:px-24"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "0 -6px 16px rgb(0 0 0 / 0.10)",
        }}
      >
        <GhostButton onClick={saveDraft} className="px-6 py-2.5">
          💾 Lưu bản nháp
        </GhostButton>

        <div className="flex items-center gap-3">
          <SubtleButton
            onClick={() => (step === 1 ? navigate(-1) : setStep(step - 1))}
            className="px-6 py-2.5"
          >
            Quay lại
          </SubtleButton>

          {step < 4 ? (
            <PrimaryButton disabled={!canNext} onClick={() => setStep(step + 1)} className="px-8 py-2.5">
              Tiếp tục →
            </PrimaryButton>
          ) : (
            <PrimaryButton
              disabled={!canNext || submitting}
              onClick={submit}
              className="px-8 py-2.5"
            >
              {submitting ? "Đang gửi..." : "📨 Gửi bài báo"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, step, label }) {
  const done = step > n;
  const active = step === n;

  const dotStyle = done || active
    ? {
        background: "var(--primary)",
        color: "#fff",
        border: "1px solid rgb(var(--primary-rgb) / 0.35)",
        boxShadow: "0 10px 25px rgb(var(--primary-rgb) / 0.20)",
      }
    : {
        background: "var(--surface)",
        color: "var(--muted)",
        border: "2px solid var(--border)",
      };

  const ringStyle = active
    ? { boxShadow: "0 0 0 6px rgb(var(--primary-rgb) / 0.18)" }
    : { boxShadow: "0 0 0 6px rgb(0 0 0 / 0)" };

  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-black"
        style={{ ...dotStyle, ...ringStyle }}
      >
        {done ? "✓" : n}
      </div>

      <div
        className="text-xs text-center w-28"
        style={{
          color: done || active ? "var(--primary)" : "var(--muted)",
          fontWeight: done || active ? 700 : 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}
