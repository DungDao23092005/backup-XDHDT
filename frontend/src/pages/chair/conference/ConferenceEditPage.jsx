import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import conferenceApi from "../../../api/conferenceApi";

const ConferenceEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    conferenceApi.getConferenceById(id).then((res) => {
      setForm({
        name: res.name,
        description: res.description || "",
      });
    });
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("FORM SUBMIT:", form);
    await conferenceApi.updateConference(id, form);
    alert("✅ Cập nhật hội nghị thành công");
    navigate(`/chair/conferences/${id}`);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Chỉnh sửa hội nghị</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border
                    text-black bg-white
                    placeholder-slate-400
                    focus:ring-2 focus:ring-primary
                    focus:outline-none
                  "
          placeholder="Tên hội nghị"
          required
        />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 rounded-lg border
                    text-black bg-white
                    placeholder-slate-400
                    focus:ring-2 focus:ring-primary
                    focus:outline-none
                    resize-none
                  "
          placeholder="Mô tả"
        />

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-lg"
          >
            Hủy
          </button>

          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg font-bold"
          >
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConferenceEditPage;
