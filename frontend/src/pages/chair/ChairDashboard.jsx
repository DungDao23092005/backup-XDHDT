import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import conferenceApi from "../../api/conferenceApi";

/* ---------------- helpers ---------------- */

function getStatus(conf) {
  const now = new Date();
  const start = new Date(conf.start_date);
  const end = new Date(conf.end_date);
  if (now < start) return "UPCOMING";
  if (now > end) return "ENDED";
  return "ONGOING";
}

/* ---------------- page ---------------- */

export default function ChairDashboard() {
  const navigate = useNavigate();

  const [conferences, setConferences] = useState([]);
  const [loadingConf, setLoadingConf] = useState(true);

  /* ----- load conferences ----- */
  const loadConferences = useCallback(async () => {
    try {
      setLoadingConf(true);
      const res = await conferenceApi.getAllConferences();
      setConferences(Array.isArray(res) ? res : []);
    } finally {
      setLoadingConf(false);
    }
  }, []);

  useEffect(() => {
    loadConferences();
  }, [loadConferences]);

  /* ----- stats ----- */
  const stats = useMemo(() => {
    const total = conferences.length;
    const ongoing = conferences.filter(
      (c) => getStatus(c) === "ONGOING"
    ).length;
    const ended = conferences.filter(
      (c) => getStatus(c) === "ENDED"
    ).length;
    return { total, ongoing, ended };
  }, [conferences]);

  const recentConfs = useMemo(
    () => conferences.slice(0, 5),
    [conferences]
  );

  /* ---------------- render ---------------- */

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900">
              Bảng điều khiển Chủ tịch Hội nghị
            </h2>
            <p className="text-slate-500 mt-1">
              Quản lý hội nghị và theo dõi tiến độ
            </p>
          </div>

          <button
            onClick={() => navigate("/chair/conferences/create")}
            className="flex items-center gap-2 px-6 h-12 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:opacity-95 active:scale-95 transition"
          >
            <span className="text-lg">＋</span>
            <span>Tạo hội nghị</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Tổng hội nghị"
            value={stats.total}
            badge="Tất cả hội nghị"
            tone="blue"
          />
          <StatCard
            title="Đang diễn ra"
            value={stats.ongoing}
            badge="Hoạt động"
            tone="green"
          />
          <StatCard
            title="Đã kết thúc"
            value={stats.ended}
            badge="Hoàn tất"
            tone="slate"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conferences */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b flex justify-between">
                <h3 className="font-bold text-lg text-slate-900">
                  Hội nghị gần đây
                </h3>
                <button
                  onClick={() => navigate("/chair/conferences")}
                  className="text-blue-600 text-sm font-semibold hover:underline"
                >
                  Xem tất cả
                </button>
              </div>

              <div className="divide-y">
                {loadingConf ? (
                  <div className="p-6 text-slate-500">
                    Đang tải...
                  </div>
                ) : recentConfs.length === 0 ? (
                  <div className="p-6 text-slate-500">
                    Chưa có hội nghị nào.
                  </div>
                ) : (
                  recentConfs.map((c) => {
                    const status = getStatus(c);
                    return (
                      <div
                        key={c.id}
                        onClick={() =>
                          navigate(`/chair/conferences/${c.id}`)
                        }
                        className="p-5 hover:bg-slate-50 cursor-pointer transition"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-900">
                              {c.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(
                                c.start_date
                              ).toLocaleDateString()}{" "}
                              –{" "}
                              {new Date(
                                c.end_date
                              ).toLocaleDateString()}
                            </div>
                          </div>
                          <StatusBadge status={status} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Notifications – UI only */}
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-900">
                  📣 Thông báo
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Đang phát triển
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                  <div className="font-bold text-lg text-slate-900">
                    Hệ thống đang hoàn thiện
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Chức năng thông báo sẽ sớm được cập nhật
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                  <div className="font-bold text-lg text-slate-900">
                    Quản lý hội nghị dễ dàng
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Truy cập danh sách hội nghị để theo dõi
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold text-lg mb-4 text-slate-900">
                Mốc quan trọng
              </h3>
              <div className="text-sm text-slate-600 space-y-3">
                <div>
                  <div className="font-bold">
                    Hạn phản biện
                  </div>
                  <div className="text-blue-600 font-bold">
                    30/11/2024
                  </div>
                </div>
                <div className="h-px bg-slate-100" />
                <div>
                  <div className="font-bold">
                    Công bố kết quả
                  </div>
                  <div className="font-bold">
                    10/12/2024
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
              <h4 className="font-bold text-lg mb-2">
                Quản lý hội nghị
              </h4>
              <p className="text-sm text-blue-100 mb-4">
                Tạo, chỉnh sửa và theo dõi hội nghị của bạn.
              </p>
              <button
                onClick={() => navigate("/chair/conferences")}
                className="w-full py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition"
              >
                Đi tới danh sách
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- components ---------------- */

function StatCard({ title, value, badge, tone }) {
  const map = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="bg-white rounded-2xl p-6 border">
      <p className="text-slate-900 text-sm font-semibold uppercase">
        {title}
      </p>
      <p className="text-4xl font-black mt-1 text-slate-900">
        {String(value).padStart(2, "0")}
      </p>
      <div
        className={`mt-3 inline-flex px-2 py-1 rounded text-xs font-bold ${map[tone]}`}
      >
        {badge}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    UPCOMING: "bg-blue-100 text-blue-700",
    ONGOING: "bg-green-100 text-green-700",
    ENDED: "bg-slate-200 text-slate-600",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-[11px] font-bold ${map[status]}`}
    >
      {status === "UPCOMING"
        ? "Sắp diễn ra"
        : status === "ONGOING"
        ? "Đang diễn ra"
        : "Đã kết thúc"}
    </span>
  );
}
