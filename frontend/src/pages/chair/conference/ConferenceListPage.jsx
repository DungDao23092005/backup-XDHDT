// src/pages/chair/conference/ConferenceListPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import conferenceApi from "../../../api/conferenceApi";

const API_URL = process.env.REACT_APP_API_URL;

const ConferenceListPage = () => {
  const navigate = useNavigate();
  const [conferences, setConferences] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    conferenceApi
      .getAllConferences()
      .then((res) => setConferences(Array.isArray(res) ? res : []))
      .catch(() => setConferences([]));
  }, []);

  const now = new Date();

const formatDateTime = (value) => {
  if (!value) return "";

  const d = new Date(value);

  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

  const getStatus = (conf) => {
    const start = new Date(conf.start_date);
    const end = new Date(conf.end_date);
    if (now < start) return "UPCOMING";
    if (now > end) return "ENDED";
    return "ONGOING";
  };

  const filteredConferences = conferences
    .filter((conf) => {
      if (filter === "ALL") return true;
      return getStatus(conf) === filter;
    })
    .filter(
      (conf) =>
        conf.name.toLowerCase().includes(keyword.toLowerCase()) ||
        conf.id.toString().includes(keyword)
    );

  const buildLogoUrl = (logo) => {
    if (!logo) return null;

    if (logo.startsWith("http")) return logo;

    if (logo.startsWith("/static")) {
      return `http://localhost:8080${logo}`;
    }

    if (logo.startsWith("static/")) {
      return `http://localhost:8080/${logo}`;
    }

    if (logo.startsWith("conference_logos/")) {
      return `http://localhost:8080/static/${logo}`;
    }

    return null;
  };
  


  const handleDelete = async (id) => {
    if (!window.confirm("Xóa hội nghị này?")) return;
    await conferenceApi.deleteConference(id);
    setConferences((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Danh sách Quản lý Hội nghị</h2>

        <button
          onClick={() => navigate("/chair/conferences/create")}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Tạo hội nghị mới
        </button>
      </div>

      {/* Search */}
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Tìm theo ID hoặc tên hội nghị..."
        className="mb-6 px-4 py-2 w-full md:w-96 border rounded-lgtext-black bg-whiteplaceholder-slate-400focus:ring-2 focus:ring-primaryfocus:outline-none"/>

      {/* Filters */}
      <div className="flex gap-3 mb-8">
        {[
          { key: "ALL", label: "Tất cả" },
          { key: "UPCOMING", label: "Sắp diễn ra" },
          { key: "ONGOING", label: "Đang diễn ra" },
          { key: "ENDED", label: "Đã kết thúc" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition
              ${
                filter === item.key
                  ? "bg-primary text-white border border-primary"
                  : "bg-white text-slate-900 border border-slate-400 hover:border-slate-700"
              }`}

          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredConferences.map((conf) => {
          console.log("CONF ID:", conf.id, "LOGO:", conf.logo);

          const status = getStatus(conf);

          return (
            <div
              key={conf.id}
              className={`bg-white rounded-xl overflow-hidden hover:shadow-lg transition
                ${
                  status === "ONGOING"
                    ? "border-2 border-green-500 ring-1 ring-green-100"
                    : status === "UPCOMING"
                    ? "border-2 border-blue-500 ring-1 ring-blue-100"
                    : "border border-slate-200"
                }
              `}
            > 

              {/* Logo */}
              <div
                onClick={() => navigate(`/chair/conferences/${conf.id}`)}
                className="h-40 bg-cover bg-center cursor-pointer"
                style={{
                  backgroundImage: `url(${
                    buildLogoUrl(conf.logo) || "/placeholder-conference.jpg"
                  })`,
                }}
              />


              <div className="p-5">
                <div className="flex justify-between">
                  <span
                    className={`text-xs font-bold ${
                      status === "ONGOING"
                        ? "text-green-600"
                        : status === "UPCOMING"
                        ? "text-blue-600"
                        : "text-slate-400"
                    }`}
                  >
                    {status === "UPCOMING"
                      ? "Sắp diễn ra"
                      : status === "ONGOING"
                      ? "Đang diễn ra"
                      : "Đã kết thúc"}
                  </span>

                  <button
                    onClick={() => handleDelete(conf.id)}
                    className="text-red-500"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>

                <h3
                  onClick={() => navigate(`/chair/conferences/${conf.id}`)}
                  className="font-bold text-lg mt-2 cursor-pointer text-slate-900 hover:underline"
                >
                  {conf.name}
                </h3>

                <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">
                    schedule
                  </span>
                  {formatDateTime(conf.start_date)} – {formatDateTime(conf.end_date)}
                </p>


                <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                  {conf.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConferenceListPage;
