import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import conferenceApi from "../../../api/conferenceApi";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const CreateConferencePage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

 const handleLogoChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setLogo(file);
  setLogoPreview(URL.createObjectURL(file));

  e.target.value = ""; // ✅ cho phép chọn lại cùng file vẫn trigger
};

useEffect(() => {
  return () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  };
}, [logoPreview]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      alert("Vui lòng nhập đầy đủ thời gian");
      return;
    }

    setIsSubmitting(true);

    try {
      await conferenceApi.createConference({
        ...form,
        logo, // ✅ gửi File lên backend qua FormData (conferenceApi đã xử lý)
      });

      alert("✅ Tạo hội nghị thành công");
      navigate("/chair");
    } catch (err) {
      console.error(err);
      alert("❌ Tạo hội nghị thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const confirmCancel = window.confirm(
      "Bạn có muốn lưu hội nghị trước khi rời đi không?\n\nNhấn OK để tiếp tục chỉnh sửa.\nNhấn Cancel để hủy bỏ."
    );

    if (!confirmCancel) {
      navigate("/chair");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Heading */}
      <div className="mb-8">
        <h2 className="text-2xl font-black mb-6">Tạo Hội nghị mới</h2>
        <p className="text-slate-700 mt-2">
          Điền thông tin chi tiết để thiết lập hội nghị khoa học mới trên hệ thống.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        {/* Thông tin cơ bản */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <span className="material-symbols-outlined text-primary">info</span>
              Thông tin cơ bản
            </h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">
                Tên hội nghị <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="px-4 py-2.5 rounded-lg border 
                          text-black bg-white 
                          placeholder-slate-400
                          focus:ring-2 focus:ring-primary 
                          focus:outline-none"
                placeholder="Ví dụ: Hội nghị Khoa học CNTT 2024"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">
                Mô tả chi tiết
              </label>

              <div className="bg-white text-black rounded-lg border border-slate-200 overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={form.description}
                  onChange={(html) =>
                    setForm((prev) => ({ ...prev, description: html }))
                  }
                  placeholder="Giới thiệu về hội nghị..."
                />
              </div>

              <p className="text-xs text-slate-500">
                Bạn có thể paste từ Word/Notion/web, hệ thống sẽ giữ định dạng cơ bản (bold, list, link, emoji).
              </p>
            </div>


            {/* Logo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="logoUpload"
                  onChange={handleLogoChange} // ✅ dùng handler đã fix
                />

                <span className="material-symbols-outlined text-primary text-3xl">
                  cloud_upload
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  Nhấp để tải logo hội nghị
                </p>
                <p className="text-xs text-slate-600">PNG, JPG, SVG (tối đa 5MB)</p>
              </label>

              <div className="flex items-center justify-center">
                <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center border overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-400">
                        image
                      </span>
                      <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">
                        Xem trước logo
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thời gian */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                calendar_month
              </span>
              Thiết lập thời gian
            </h3>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Start */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Thời gian bắt đầu
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="px-3 py-2 rounded-lg border text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary"
                />
                <input
                  type="time"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  className="px-3 py-2 rounded-lg border text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* End */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Thời gian kết thúc
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="px-3 py-2 rounded-lg border text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary"
                />
                <input
                  type="time"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  className="px-3 py-2 rounded-lg border text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2.5 rounded-lg text-slate-600 hover:bg-slate-200"
          >
            Hủy bỏ
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-10 py-2.5 rounded-lg font-bold flex items-center gap-2
              ${isSubmitting ? "bg-slate-400" : "bg-primary text-white"}`}
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {isSubmitting ? "Đang lưu..." : "Lưu hội nghị"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateConferencePage;
