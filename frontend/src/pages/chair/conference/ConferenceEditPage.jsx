import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import conferenceApi from "../../../api/conferenceApi";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8080";

const buildLogoUrl = (logo) => {
  if (!logo) return null;
  if (logo.startsWith("http")) return logo;
  if (logo.startsWith("/static/")) return `${API_BASE}/conference${logo}`;
  return `${API_BASE}/conference/${logo}`;
};

const ConferenceEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    logo: null, // File mới nếu user chọn
  });

  const [currentLogo, setCurrentLogo] = useState(null); // logo từ backend (/static/...)
  const [logoPreview, setLogoPreview] = useState(null); // preview local khi chọn file

useEffect(() => {
  conferenceApi.getConferenceById(id).then((res) => {
    setForm((prev) => ({
      ...prev,
      name: res.name || "",
      description: res.description || "", // ✅ GIỮ NỘI DUNG CŨ
      logo: null,
    }));
    setCurrentLogo(res.logo || null);
    setLogoPreview(null);
  });
}, [id]);


  // cleanup objectURL
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForm((prev) => ({ ...prev, logo: file }));
    setLogoPreview(URL.createObjectURL(file));
    e.target.value = ""; // chọn lại cùng file vẫn trigger
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await conferenceApi.updateConference(id, form);
      alert("✅ Cập nhật hội nghị thành công");
      navigate(`/chair/conferences/${id}`);
    } catch (err) {
      console.error(err);
      alert("❌ Cập nhật thất bại");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-black mb-6 text-slate-900">
        Chỉnh sửa hội nghị
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Name */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <label className="text-sm font-semibold text-slate-900">
            Tên hội nghị <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-2 w-full px-4 py-2.5 rounded-lg border
                      text-black bg-white
                      placeholder-slate-400
                      focus:ring-2 focus:ring-primary
                      focus:outline-none"
            placeholder="Tên hội nghị"
            required
          />
        </div>

        {/* Description (Rich Text) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <label className="text-sm font-semibold text-slate-900">
            Mô tả chi tiết
          </label>

          <div className="mt-2 bg-white text-black rounded-lg border border-slate-200 overflow-hidden">
            <ReactQuill
              theme="snow"
              value={form.description || ""}  // ✅ luôn có string
              onChange={(html) =>
                setForm((prev) => ({ ...prev, description: html }))
              }
              placeholder="Mô tả hội nghị..."
            />
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Bạn có thể paste từ Word/Notion/web, hệ thống sẽ giữ định dạng cơ bản.
          </p>
        </div>

        {/* Logo */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Logo hội nghị
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Chọn ảnh mới để thay logo (PNG/JPG)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 cursor-pointer hover:bg-slate-100">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <span className="material-symbols-outlined text-primary text-3xl">
                cloud_upload
              </span>
              <p className="text-sm font-semibold text-slate-900">
                Nhấp để chọn logo mới
              </p>
              <p className="text-xs text-slate-600">PNG, JPG (tối đa 5MB)</p>
            </label>

            <div className="flex items-center justify-center">
              <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center border overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                ) : currentLogo ? (
                  <img
                    src={buildLogoUrl(currentLogo)}
                    alt="Current logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-400">
                      image
                    </span>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">
                      Chưa có logo
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {logoPreview && (
            <div className="mt-3 text-xs text-slate-600">
              ✅ Đã chọn logo mới — bấm <b>Lưu</b> để cập nhật.
            </div>
          )}
        </div>

        {/* Actions */}
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
