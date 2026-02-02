import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import trackApi from "../../../api/trackApi";
import topicApi from "../../../api/topicApi";

const TrackEditPage = () => {
  const { id } = useParams(); // trackId
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);

  // ===== Topics state =====
  const [topics, setTopics] = useState([]);
  const [topicForm, setTopicForm] = useState({ name: "", description: "" });
  const [topicLoading, setTopicLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // 1) load track
        const trackRes = await trackApi.getTrackById(id);
        const track = trackRes?.data || trackRes;

        if (!mounted || !track) return;

        setForm({
          name: track.name || "",
          description: track.description || "",
        });

        // 2) load topics by track
        try {
          const topicsRes = await topicApi.getTopicsByTrack(id);
          const list = topicsRes?.data || topicsRes;
          if (mounted) setTopics(Array.isArray(list) ? list : []);
        } catch (err) {
          console.error("Load topics failed:", err);
          if (mounted) setTopics([]);
        }
      } catch (err) {
        console.error("Load track failed:", err);
        alert("Không tải được Track");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await trackApi.updateTrack(id, form);
      alert("✅ Cập nhật Track thành công");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Cập nhật Track thất bại");
    }
  };

  // ===== Topic handlers =====
  const handleCreateTopic = async () => {
    if (!topicForm.name.trim()) return alert("Vui lòng nhập tên topic");

    setTopicLoading(true);
    try {
      const res = await topicApi.createTopic({
        name: topicForm.name.trim(),
        description: topicForm.description || "",
        track_id: Number(id),
      });

      const created = res?.topic || res;

      if (created?.id) {
        setTopics((prev) => [...prev, created]);
      } else {
        // fallback reload
        const topicsRes = await topicApi.getTopicsByTrack(id);
        const list = topicsRes?.data || topicsRes;
        setTopics(Array.isArray(list) ? list : []);
      }

      setTopicForm({ name: "", description: "" });
      alert("✅ Tạo topic thành công");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Tạo topic thất bại");
    } finally {
      setTopicLoading(false);
    }
  };

  const handleRenameTopic = async (topic) => {
    const newName = window.prompt("Tên topic mới:", topic.name);
    if (!newName || !newName.trim()) return;

    try {
      const res = await topicApi.updateTopic(topic.id, { name: newName.trim() });
      const updated = res?.topic || res;

      setTopics((prev) =>
        prev.map((t) =>
          t.id === topic.id ? { ...t, ...updated, name: newName.trim() } : t
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Cập nhật topic thất bại");
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Xóa topic này?")) return;

    try {
      await topicApi.deleteTopic(topicId);
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Xóa topic thất bại");
    }
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-6">Chỉnh sửa Track</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label>Tên Track</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="px-4 py-2.5 rounded-lg border
                       text-black bg-white
                       placeholder-slate-400
                       focus:ring-2 focus:ring-primary
                       focus:outline-none resize-none"
            required
          />
        </div>

        <div>
          <label>Mô tả</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full mt-1 px-4 py-2 rounded-lg border
                       text-black bg-white
                       placeholder-slate-400
                       focus:ring-2 focus:ring-primary
                       focus:outline-none
                       resize-none"
          />
        </div>

        {/* ===== TOPICS SECTION ===== */}
        <div className="border rounded-xl p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-black">
              Topics trong Track{topics.length ? ` (${topics.length})` : ""}
            </h3>
          </div>

          {/* List topics as tags */}
          {topics.length === 0 ? (
            <p className="text-sm italic text-slate-500">Chưa có topic nào</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {topics.map((tp) => (
                <div
                  key={tp.id}
                  className="flex items-center gap-2 px-3 py-1 rounded-full border bg-white"
                  title={tp.description || ""}
                >
                  <span className="text-sm text-slate-800">{tp.name}</span>

                  <button
                    type="button"
                    title="Đổi tên"
                    onClick={() => handleRenameTopic(tp)}
                  >
                    <span
                      className="material-symbols-outlined text-blue-600"
                      style={{ fontSize: 18 }}
                    >
                      edit
                    </span>
                  </button>

                  <button
                    type="button"
                    title="Xóa"
                    onClick={() => handleDeleteTopic(tp.id)}
                  >
                    <span
                      className="material-symbols-outlined text-red-500"
                      style={{ fontSize: 18 }}
                    >
                      delete
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create new topic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-black">Tên topic mới</label>
              <input
                value={topicForm.name}
                onChange={(e) =>
                  setTopicForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Ví dụ: AI, IoT, Security..."
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-white text-black
                           placeholder-slate-400 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black">
                Mô tả (tuỳ chọn)
              </label>
              <input
                value={topicForm.description}
                onChange={(e) =>
                  setTopicForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Mô tả ngắn"
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-white text-black
                           placeholder-slate-400 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleCreateTopic}
              disabled={topicLoading}
              className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {topicLoading ? "Đang tạo..." : "+ Thêm Topic"}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2"
          >
            Hủy
          </button>
          <button className="bg-primary text-white px-6 py-2 rounded-lg">
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
};

export default TrackEditPage;
