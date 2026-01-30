import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import trackApi from "../../../api/trackApi";

const TrackEditPage = () => {
  const { id } = useParams(); // trackId
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);

useEffect(() => {
  let mounted = true;

  trackApi.getTrackById(id)
    .then((res) => {
      const track = res?.data || res;

      if (!track || !mounted) return;

      setForm({
        name: track.name || "",
        description: track.description || "",
      });
    })
    .catch((err) => {
      console.error("Load track failed:", err);
      alert("Không tải được Track");
    })
    .finally(() => {
      if (mounted) setLoading(false); // 🔥 QUAN TRỌNG
    });

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
    await trackApi.updateTrack(id, form);
    alert("✅ Cập nhật Track thành công");
    navigate(-1); // quay lại conference detail
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
                      resize-none
                    "
          />
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
