import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import conferenceApi from "../../../api/conferenceApi";
import trackApi from "../../../api/trackApi";

const CreateTrackPage = () => {
  const navigate = useNavigate();

  const [conferences, setConferences] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    conferenceId: "",
  });

const [isSubmitting, setIsSubmitting] = useState(false);

useEffect(() => {
  conferenceApi
    .getAllConferences()
    .then((res) => {
      console.log("Conferences:", res);
      setConferences(Array.isArray(res) ? res : []);
    })
    .catch((err) => {
      console.error(err);
      setConferences([]);
    });
}, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.conferenceId) {
      alert("Vui lòng chọn hội nghị");
      return;
    }

    setIsSubmitting(true);
    try {
      await trackApi.createTrack(form);
      alert("✅ Tạo track thành công");
      navigate("/chair");
    } catch (err) {
      console.error(err);
      alert("❌ Tạo track thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-black mb-6">Tạo Track (Chủ đề)</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Conference */}
        <div>
          <label className="font-semibold text-sm">Chọn hội nghị  </label>
          <select
            name="conferenceId"
            value={form.conferenceId}
            onChange={handleChange}
            required
            className="px-4 py-2.5 rounded-lg border text-slate-900
           focus:border-primary focus:ring-2 focus:ring-primary"
            >
            <option value="">-- Chọn hội nghị --</option>

            {conferences.map((conf) => (
                <option key={conf.id} value={conf.id}
                className="text-slate-900">
                {conf.name}
                </option>
            ))}
            </select>
        </div>

        {/* Track name */}
        <div>
          <label className="font-semibold text-sm">Tên Track</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="px-4 py-2.5 rounded-lg border 
                      text-black bg-white 
                      placeholder-slate-400
                      focus:ring-2 focus:ring-primary 
                      focus:outline-none resize-none"
            placeholder="Ví dụ: Artificial Intelligence"
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-semibold text-sm">Mô tả</label>
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

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/chair")}
            className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-200"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2 bg-primary text-white rounded-lg font-bold"
          >
            {isSubmitting ? "Đang lưu..." : "Lưu Track"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTrackPage;
