// src/pages/chair/ReviewerAssignmentPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import reviewerApi from "../../api/reviewerApi";
import conferenceApi from "../../api/conferenceApi";
import topicApi from "../../api/topicApi";

// ---- helpers: interests có thể array / JSON string / "a,b,c"
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

// ---- ongoing heuristic
const isOngoingConference = (c) => {
  const status = String(c?.status || c?.state || "").toUpperCase();
  if (["ONGOING", "ACTIVE", "OPEN", "RUNNING"].includes(status)) return true;

  const now = Date.now();
  const start = c?.start_date || c?.startDate || c?.start_time || c?.starts_at;
  const end = c?.end_date || c?.endDate || c?.end_time || c?.ends_at;

  const startMs = start ? new Date(start).getTime() : null;
  const endMs = end ? new Date(end).getTime() : null;

  if (startMs && endMs) return startMs <= now && now <= endMs;
  return false;
};

// ---- dedupe accepted reviewers by email (fallback by name)
const makeReviewerKey = (inv, acc) => {
  const email = (acc?.email || inv?.reviewer_email || "").toLowerCase().trim();
  if (email) return `email:${email}`;
  const name = (acc?.full_name || acc?.name || inv?.reviewer_name || "").toLowerCase().trim();
  return name ? `name:${name}` : `unknown:${String(acc?.id || inv?.id || Math.random())}`;
};

// ---- helper: safe get ids
const asStr = (v) => (v === null || v === undefined ? "" : String(v));
const normId = (v) => asStr(v).trim();

// ---- helper: paper filters

// ✅ match conference:
// - nếu paper có conference_id thì match trực tiếp
// - nếu paper KHÔNG có conference_id (case của bạn) -> fallback bằng track_id thuộc conference đang chọn
const matchConference = (paper, confId, confTracks = []) => {
  if (!confId) return true;

  const pid =
    paper?.conference_id ??
    paper?.conferenceId ??
    paper?.conference?.id ??
    paper?.conference?.conference_id ??
    null;

  if (pid != null) return normId(pid) === normId(confId);

  // fallback by track list
  const tid = paper?.track_id ?? paper?.trackId ?? paper?.track?.id ?? null;
  if (tid == null) return false;

  const trackIdSet = new Set((confTracks || []).map((t) => normId(t?.id)));
  return trackIdSet.has(normId(tid));
};

const matchTrack = (paper, trackId) => {
  if (!trackId) return true;
  const tid = paper?.track_id ?? paper?.trackId ?? paper?.track?.id ?? null;
  if (tid == null) return false;
  return normId(tid) === normId(trackId);
};

// ✅ topics trong paper của bạn: [{ topic_id: 1, id: 2 }]
// nên phải ưu tiên topic_id (không lấy id)
const extractTopicIds = (paper) => {
  const raw =
    paper?.topic_ids ??
    paper?.topicIds ??
    paper?.topics ??
    paper?.topic ??
    paper?.topic_id ??
    paper?.topicId ??
    null;

  if (!raw) return [];

  if (typeof raw === "number" || typeof raw === "string") return [normId(raw)];

  if (Array.isArray(raw)) {
    return raw
      .map((x) => {
        if (x == null) return "";
        if (typeof x === "number" || typeof x === "string") return normId(x);
        // ✅ ưu tiên topic_id vì data có {topic_id, id}
        return normId(x.topic_id ?? x.topicId ?? x.id);
      })
      .filter(Boolean);
  }

  if (typeof raw === "object") {
    const id = raw.topic_id ?? raw.topicId ?? raw.id;
    return id != null ? [normId(id)] : [];
  }

  return [];
};

const matchTopic = (paper, topicId) => {
  if (!topicId) return true;
  const ids = extractTopicIds(paper);
  return ids.includes(normId(topicId));
};

export default function ReviewerAssignmentPage() {
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const [conferences, setConferences] = useState([]);
  const [searchConf, setSearchConf] = useState("");
  const [selectedConfId, setSelectedConfId] = useState(null);

  // track/topic
  const [tracks, setTracks] = useState([]);
  const [topics, setTopics] = useState([]); // flatten all topics of selected conf
  const [topicsByTrack, setTopicsByTrack] = useState({}); // { [trackId]: Topic[] }
  const [trackId, setTrackId] = useState("");
  const [topicId, setTopicId] = useState("");

  // reviewer accepted
  const [items, setItems] = useState([]); // invitations
  const [reviewerAccounts, setReviewerAccounts] = useState([]); // identity users

  // multi-select reviewers
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [conf, inv, accounts] = await Promise.all([
        reviewerApi.getConferences(),
        reviewerApi.getInvitations(),
        reviewerApi.getReviewerAccounts(),
      ]);

      setConferences(Array.isArray(conf) ? conf : []);
      setItems(Array.isArray(inv) ? inv : []);
      setReviewerAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (e) {
      console.error(e);
      setConferences([]);
      setItems([]);
      setReviewerAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const ongoingConfs = useMemo(() => {
    const q = searchConf.trim().toLowerCase();
    return (conferences || [])
      .filter(isOngoingConference)
      .filter((c) => {
        if (!q) return true;
        const name = String(c?.name || c?.conference_name || "").toLowerCase();
        const code = String(c?.code || c?.slug || "").toLowerCase();
        return name.includes(q) || code.includes(q);
      });
  }, [conferences, searchConf]);

  const selectedConference = useMemo(() => {
    const id = String(selectedConfId || "");
    return (conferences || []).find((c) => String(c?.id) === id) || null;
  }, [conferences, selectedConfId]);

  // ✅ Load tracks/topics
  useEffect(() => {
    const run = async () => {
      if (!selectedConfId) {
        setTracks([]);
        setTopics([]);
        setTopicsByTrack({});
        setTrackId("");
        setTopicId("");
        setSelectedIds(new Set());
        return;
      }

      setTracks([]);
      setTopics([]);
      setTopicsByTrack({});
      setTrackId("");
      setTopicId("");
      setSelectedIds(new Set());

      try {
        const t = await conferenceApi.getTracksByConference(selectedConfId);
        const trackList = Array.isArray(t) ? t : [];
        setTracks(trackList);

        const map = {};
        await Promise.all(
          trackList.map(async (tr) => {
            try {
              const tp = await topicApi.getTopicsByTrack(tr.id);
              map[tr.id] = Array.isArray(tp) ? tp : [];
            } catch (err) {
              console.error("Load topics failed for track", tr.id, err);
              map[tr.id] = [];
            }
          })
        );

        setTopicsByTrack(map);
        setTopics(Object.values(map).flat());
      } catch (e) {
        console.error("Load tracks/topics failed", e);
        setTracks([]);
        setTopics([]);
        setTopicsByTrack({});
      }
    };

    run();
  }, [selectedConfId]);

  // map email -> account
  const accountByEmail = useMemo(() => {
    const m = new Map();
    (reviewerAccounts || []).forEach((u) => {
      const email = (u.email || "").toLowerCase().trim();
      if (email) m.set(email, u);
    });
    return m;
  }, [reviewerAccounts]);

  const invitedCountForSelected = useMemo(() => {
    if (!selectedConference) return 0;

    const selectedId = String(selectedConference?.id ?? "");
    const selectedName = String(selectedConference?.name || selectedConference?.conference_name || "").trim();

    return (items || []).filter((x) => {
      const cid = x?.conference_id ?? x?.conferenceId ?? null;
      const cname = String(x?.conference_name || x?.conferenceName || "").trim();
      if (cid != null && selectedId) return String(cid) === selectedId;
      if (selectedName && cname) return cname === selectedName;
      return false;
    }).length;
  }, [items, selectedConference]);

  const acceptedReviewers = useMemo(() => {
    const list = (items || []).filter((i) => String(i.status).toUpperCase() === "ACCEPTED");
    if (!selectedConference) return [];

    const selectedId = String(selectedConference?.id ?? "");
    const selectedName = String(selectedConference?.name || selectedConference?.conference_name || "").trim();

    const filtered = list.filter((inv) => {
      const cid = inv?.conference_id ?? inv?.conferenceId ?? null;
      const cname = String(inv?.conference_name || inv?.conferenceName || "").trim();

      if (cid != null && selectedId) return String(cid) === selectedId;
      if (!cid && cname && selectedName) return cname === selectedName;
      if (!cid && !cname) return true;
      return false;
    });

    const withAcc = filtered
      .map((inv) => {
        const acc = accountByEmail.get((inv.reviewer_email || "").toLowerCase().trim()) || null;
        return { ...inv, account: acc };
      })
      .filter((x) => !!x.account);

    const dedupMap = new Map();
    for (const row of withAcc) {
      const key = makeReviewerKey(row, row.account);
      if (!dedupMap.has(key)) dedupMap.set(key, row);
    }
    return Array.from(dedupMap.values());
  }, [items, accountByEmail, selectedConference]);

  const allChecked = useMemo(() => {
    if (!acceptedReviewers.length) return false;
    return acceptedReviewers.every((r) => selectedIds.has(String(r.account.id)));
  }, [acceptedReviewers, selectedIds]);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

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
        acceptedReviewers.forEach((r) => next.delete(String(r.account.id)));
      } else {
        acceptedReviewers.forEach((r) => next.add(String(r.account.id)));
      }
      return next;
    });
  };

  const topicOptions = useMemo(() => {
    if (!trackId) return topics || [];
    return (topics || []).filter((t) => String(t.track_id) === String(trackId));
  }, [topics, trackId]);

  const getTopicTagsForConf = (conf) => {
    if (!selectedConfId || String(conf?.id) !== String(selectedConfId)) return [];
    const all = Object.values(topicsByTrack || {}).flat();
    return all.map((x) => x?.name).filter(Boolean);
  };

  const handleAssign = async () => {
    if (!selectedConference) {
      alert("Vui lòng chọn hội nghị.");
      return;
    }
    if (selectedIds.size === 0) {
      alert("Vui lòng chọn ít nhất 1 reviewer.");
      return;
    }

    setAssigning(true);
    try {
      const papers = await reviewerApi.getOpenPapersForBidding();

      const filtered = (papers || []).filter((p) => {
        return (
          matchConference(p, selectedConference.id, tracks) &&
          matchTrack(p, trackId) &&
          matchTopic(p, topicId)
        );
      });

      const paperIds = filtered.map((p) => p?.id).filter((x) => x !== null && x !== undefined);

      if (paperIds.length === 0) {
        alert("Không có bài nào phù hợp để phân công theo bộ lọc hiện tại.");
        return;
      }

      const reviewerIds = Array.from(selectedIds)
        .map((x) => Number(x))
        .filter((x) => !Number.isNaN(x));

      const chosenTrack = tracks.find((t) => String(t.id) === String(trackId));
      const chosenTopic = (topics || []).find((t) => String(t.id) === String(topicId));
      const ok = window.confirm(
        `Xác nhận phân công?\n` +
          `Hội nghị: ${selectedConference?.name || selectedConference?.conference_name}\n` +
          `Track: ${chosenTrack?.name || (trackId ? trackId : "—")}\n` +
          `Topic: ${chosenTopic?.name || (topicId ? topicId : "—")}\n` +
          `Reviewer: ${reviewerIds.length}\n` +
          `Bài phù hợp: ${paperIds.length}\n\n` +
          `Lưu ý: hệ thống sẽ bỏ qua các bài đã phân công trùng.`
      );
      if (!ok) return;

      let created = 0;
      let skipped = 0;

      for (const rid of reviewerIds) {
        let existing = [];
        try {
          existing = await reviewerApi.listAssignmentsByReviewer(rid);
        } catch (e) {
          console.error("listAssignmentsByReviewer failed", rid, e);
          existing = [];
        }

        const existingPaperIds = new Set(
          (existing || [])
            .map((a) => a?.paper_id ?? a?.paperId)
            .filter(Boolean)
            .map(String)
        );

        for (const pid of paperIds) {
          const pidStr = String(pid);
          if (existingPaperIds.has(pidStr)) {
            skipped += 1;
            continue;
          }

          try {
            await reviewerApi.createAssignment({
              reviewer_id: rid,
              paper_id: Number(pid),
              is_manual: true,
              due_date: null,
            });
            created += 1;
          } catch (e) {
            console.error("createAssignment failed", { rid, pid }, e);
            skipped += 1;
          }
        }
      }

      alert(`✅ Phân công xong!\nTạo mới: ${created}\nBỏ qua/Trùng/Lỗi: ${skipped}`);
    } catch (e) {
      console.error(e);
      alert("❌ Phân công thất bại. Xem console log để biết chi tiết.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Phân công Reviewer</h2>
            <p className="text-slate-500 mt-1">
              Chọn hội nghị ongoing → chọn track/topic → chọn reviewer đã chấp nhận để phân công
            </p>
          </div>

          <button
            onClick={fetchData}
            className="px-4 h-11 rounded-xl border bg-white font-bold text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: conferences */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  placeholder="Tìm hội nghị ongoing..."
                  value={searchConf}
                  onChange={(e) => setSearchConf(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-[68vh] overflow-auto">
              {loading ? (
                <div className="p-6 text-slate-500">Đang tải hội nghị...</div>
              ) : ongoingConfs.length === 0 ? (
                <div className="p-6 text-slate-400">Không có hội nghị ongoing.</div>
              ) : (
                <ul className="divide-y">
                  {ongoingConfs.map((c) => {
                    const id = String(c.id);
                    const active = String(selectedConfId) === id;
                    const name = c.name || c.conference_name || "—";
                    const code = c.code || c.slug || "";
                    const topicTags = getTopicTagsForConf(c);

                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => setSelectedConfId(id)}
                          className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition ${
                            active ? "bg-slate-50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2">
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black"
                                  style={{
                                    backgroundColor: "rgb(var(--primary-rgb) / 0.10)",
                                    color: "var(--primary)",
                                    border: "1px solid rgb(var(--primary-rgb) / 0.20)",
                                  }}
                                >
                                  #Hội Nghị
                                </span>
                              </div>

                              <p className="font-black text-slate-900 truncate">{name}</p>
                              <p className="text-xs text-slate-500 mt-1">{code ? `Mã: ${code}` : " "}</p>

                              {topicTags.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {topicTags.slice(0, 6).map((t, idx) => (
                                    <span
                                      key={`${id}-topic-${idx}`}
                                      className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {topicTags.length > 6 ? (
                                    <span className="text-[10px] text-slate-400">+{topicTags.length - 6}</span>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="mt-2 text-[11px] text-slate-400 italic">(Chưa có topic)</p>
                              )}
                            </div>

                            {active && (
                              <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700">
                                Đang chọn
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-white">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hội nghị đã chọn</p>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    {selectedConference?.name || selectedConference?.conference_name || "Chưa chọn hội nghị"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-slate-500">groups</span>
                    <span className="text-sm text-slate-600 font-bold">
                      Đã mời: <span className="text-slate-900 font-black">{invitedCountForSelected}</span>
                    </span>
                  </div>

                  <button
                    onClick={handleAssign}
                    className="px-5 h-11 bg-rose-600 text-white rounded-xl font-bold shadow hover:opacity-95 disabled:opacity-60"
                    disabled={!selectedConference || selectedCount === 0 || assigning}
                  >
                    {assigning ? "Đang phân công..." : `Phân công (${String(selectedCount).padStart(2, "0")})`}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Track</label>
                  <select
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                    value={trackId}
                    onChange={(e) => {
                      setTrackId(e.target.value);
                      setTopicId("");
                    }}
                    disabled={!selectedConference || tracks.length === 0}
                  >
                    <option value="">
                      {!selectedConference ? "Chọn hội nghị trước" : tracks.length ? "Chọn track" : "Chưa có track"}
                    </option>
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Topic</label>
                  <select
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    disabled={!selectedConference || topicOptions.length === 0}
                  >
                    <option value="">
                      {!selectedConference
                        ? "Chọn hội nghị trước"
                        : topicOptions.length
                        ? "Chọn topic"
                        : "Chưa có topic"}
                    </option>
                    {topicOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* reviewers table */}
            <div className="overflow-auto max-h-[62vh]">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 border-b z-10">
                  <tr>
                    <th className="px-5 py-3 w-12">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-slate-300"
                        checked={allChecked}
                        onChange={toggleAll}
                        disabled={!selectedConference || acceptedReviewers.length === 0}
                      />
                    </th>
                    <Th>Reviewer</Th>
                    <Th>Đơn vị công tác</Th>
                    <Th>Lĩnh vực</Th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {!selectedConference ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                        Vui lòng chọn 1 hội nghị ở bên trái.
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        Đang tải reviewer...
                      </td>
                    </tr>
                  ) : acceptedReviewers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                        Chưa có reviewer nào đã chấp nhận (và có tài khoản).
                      </td>
                    </tr>
                  ) : (
                    acceptedReviewers.map((r) => {
                      const acc = r.account;
                      const id = String(acc.id);
                      const name = acc.full_name || acc.name || r.reviewer_name || "—";
                      const email = acc.email || r.reviewer_email || "—";
                      const affiliation = pickAffiliation(acc);
                      const interests = pickInterests(acc);

                      return (
                        <tr key={`acc-${id}`} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-slate-300"
                              checked={selectedIds.has(id)}
                              onChange={() => toggleOne(id)}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <div>
                              <p className="font-bold text-slate-900">{name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{email}</p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">{affiliation}</td>

                          <td className="px-5 py-4">
                            {interests.length ? (
                              <div className="flex flex-wrap gap-1">
                                {interests.slice(0, 6).map((tag, idx) => (
                                  <span
                                    key={`${id}-tag-${idx}`}
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-white flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Đã chọn{" "}
                <span className="font-black text-slate-900">{String(selectedCount).padStart(2, "0")}</span>{" "}
                reviewer
              </p>
              <button
                className="px-4 h-10 rounded-xl border font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => setSelectedIds(new Set())}
                disabled={!selectedCount || assigning}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        {selectedConference && tracks.length === 0 ? (
          <div className="text-xs text-slate-500">
            * Không thấy track? Kiểm tra endpoint{" "}
            <code className="mx-1">GET /conference/api/tracks/conference/{`{conferenceId}`}</code>.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}