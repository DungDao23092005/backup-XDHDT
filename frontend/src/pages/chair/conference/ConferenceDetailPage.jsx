import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import conferenceApi from "../../../api/conferenceApi";
import trackApi from "../../../api/trackApi";
const API_URL = process.env.REACT_APP_API_URL;


const ConferenceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conference, setConference] = useState(null);
  const [tracks, setTracks] = useState([]);
  
  const [form, setForm] = useState({
  name: "",
  description: "",
  start_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  logo: null,
});

const handleUpdate = async () => {
  try {
    await conferenceApi.updateConference(id, form);
    alert("Cập nhật hội nghị thành công");
  } catch (err) {
    console.error(err);
    alert("Cập nhật thất bại");
  }
};


useEffect(() => {
  conferenceApi.getConferenceById(id).then((res) => {
    setConference(res);

    setForm({
      name: res.name,
      description: res.description || "",
      start_date: res.start_date?.slice(0, 10),
      start_time: res.start_date?.slice(11, 16),
      end_date: res.end_date?.slice(0, 10),
      end_time: res.end_date?.slice(11, 16),
      logo: null,
    });
  });

  conferenceApi.getTracksByConference(id).then(setTracks);
}, [id]);



  if (!conference) return <p className="p-8">Đang tải...</p>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{conference.name}</h2>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/chair/conferences/${id}/edit`)}
            className="px-4 py-2 border rounded-lg"
          >
            Chỉnh sửa
          </button>

          <button
            onClick={async () => {
              if (!window.confirm("Xóa hội nghị này?")) return;
              await conferenceApi.deleteConference(id);
              navigate("/chair/conferences");
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            Xóa
          </button>
        </div>
      </div>

      {/* Logo */}
      {conference.logo && (
        <img
          src={`${API_URL}/static/${conference.logo}`}
          className="h-56 rounded-xl mb-6 object-cover"
        />
      )}

      <p className="text-white mb-8">{conference.description}</p>
        {/* Thời gian hội nghị */}
        <div className="mb-10 p-5 border rounded-xl bg-slate-50">
          <h3 className="font-bold mb-4 text-black">Thời gian hội nghị</h3>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label className="text-sm font-medium text-black">Ngày bắt đầu</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 
                          text-black bg-white
                          focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black">Giờ bắt đầu</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm({ ...form, start_time: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 
                          text-black bg-white
                          focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black">Ngày kết thúc</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 
                          text-black bg-white
                          focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black">Giờ kết thúc</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) =>
                  setForm({ ...form, end_time: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 
                          text-black bg-white
                          focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>


          <div className="mt-4 flex justify-end">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              Lưu thay đổi
            </button>

          </div>
        </div>

      {/* Tracks */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Danh sách Track</h3>
        <button
          onClick={() =>
            navigate(`/chair/tracks/create?conferenceId=${conference.id}`)
          }
          className="bg-primary text-white px-4 py-2 rounded-lg"
        >
          + Thêm Track
        </button>
      </div>

      {tracks.length === 0 ? (
        <p className="italic text-slate-500">Chưa có track nào</p>
      ) : (
        <div className="space-y-3">
          {tracks.map((t) => (
            <div
              key={t.id}
              className="p-4 border rounded-lg flex justify-between"
            >
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-slate-500">{t.description}</p>
              </div>

              <div className="flex items-center gap-3">
          {/* Edit */}
          <button
            onClick={() => navigate(`/chair/tracks/${t.id}/edit`)}
            title="Chỉnh sửa track"
          >
            <span className="material-symbols-outlined text-blue-600">
              edit
            </span>
          </button>

          {/* Delete */}
          <button
            onClick={async () => {
              if (!window.confirm("Xóa track này?")) return;

              try {
                await trackApi.deleteTrack(t.id);
                setTracks((prev) => prev.filter((x) => x.id !== t.id));
              } catch (err) {
                console.error(err);
                alert("Xóa track thất bại");
              }
            }}
            className="text-red-500"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConferenceDetailPage;
