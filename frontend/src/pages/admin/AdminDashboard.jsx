import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

const ROLE_ORDER = [ROLES.AUTHOR, ROLES.REVIEWER, ROLES.CHAIR, ROLES.ADMIN];

// --- HELPERS ---
const getInitials = (name) => (name || "U").substring(0, 2).toUpperCase();

const badgeClass = (roleName) => {
  switch ((roleName || "").toUpperCase()) {
    case ROLES.ADMIN:
      return "bg-indigo-100 text-indigo-700 border border-indigo-200";
    case ROLES.CHAIR:
      return "bg-purple-100 text-purple-700 border border-purple-200";
    case ROLES.REVIEWER:
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case ROLES.AUTHOR:
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
};

const normalizeUsers = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.users)) return raw.users;
  return [];
};

export default function AdminDashboard() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ ADD: activities state phải nằm trong component
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // --- STATE MODAL & FORM ---
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // True = Sửa, False = Thêm mới
  const [editingUserId, setEditingUserId] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: ROLES.AUTHOR,
  });
  const [submitting, setSubmitting] = useState(false);

  // API Endpoints
  const USERS_API = useMemo(() => "/identity/api/users/", []);
  const CREATE_USER_API = "/identity/api/users/registration";

  // --- TẢI DANH SÁCH USER ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosClient.get(USERS_API);
      const data = res?.data ?? res;
      setUsers(normalizeUsers(data));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setError("⛔ Token hết hạn. Đăng nhập lại.");
      else if (status === 403) setError("⛔ Không có quyền ADMIN.");
      else setError("❌ Lỗi tải danh sách user.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [USERS_API]);

  // ✅ ADD: fetchActivities đúng chuẩn + parse res.data
  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await axiosClient.get("/identity/api/users/activities");
      const data = res?.data ?? res;
      setActivities(Array.isArray(data) ? data : data?.activities ?? []);
    } catch (error) {
      console.error("Lỗi tải hoạt động:", error);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, [fetchUsers, fetchActivities]);

  // --- MỞ MODAL THÊM MỚI ---
  const openAddModal = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setFormData({ email: "", password: "", full_name: "", role: ROLES.AUTHOR });
    setShowModal(true);
  };

  // --- MỞ MODAL SỬA ---
  const openEditModal = (targetUser) => {
    setIsEditMode(true);
    setEditingUserId(targetUser.id);

    // Lấy role hiện tại
    const currentRole = targetUser.roles?.[0]?.role_name || ROLES.AUTHOR;

    setFormData({
      email: targetUser.email,
      password: "", // Để trống, nếu nhập mới tính là đổi pass
      full_name: targetUser.full_name,
      role: currentRole.toUpperCase(),
    });
    setShowModal(true);
  };

  // --- XỬ LÝ SUBMIT FORM (CREATE / UPDATE) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) {
      toast.warning("Vui lòng điền tên và email!");
      return;
    }
    // Khi tạo mới bắt buộc có password
    if (!isEditMode && !formData.password) {
      toast.warning("Vui lòng nhập mật khẩu cho tài khoản mới!");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        // --- LOGIC SỬA (UPDATE) ---
        await axiosClient.put(`${USERS_API}${editingUserId}`, {
          full_name: formData.full_name,
          email: formData.email,
        });

        await axiosClient.put(`${USERS_API}${editingUserId}/role`, {
          role_name: formData.role,
        });

        toast.success("✅ Cập nhật thành công!");
      } else {
        // --- LOGIC THÊM MỚI (CREATE) ---
        await axiosClient.post(CREATE_USER_API, {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
        });
        toast.success("🎉 Tạo tài khoản thành công!");
      }

      setShowModal(false);
      fetchUsers();
      fetchActivities(); // ✅ optional: refresh log sau khi thao tác
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Đã có lỗi xảy ra.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- XỬ LÝ XÓA USER ---
  const handleDelete = async (userId) => {
    if (!window.confirm("⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn người dùng này?")) return;

    try {
      await axiosClient.delete(`${USERS_API}${userId}`);
      toast.success("🗑️ Đã xóa người dùng.");
      fetchUsers();
      fetchActivities(); // ✅ optional
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xóa người dùng.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Tiêu đề & Nút Refresh */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Quản lý Người dùng
            </h1>
            <p className="text-gray-500 mt-1">Danh sách tài khoản và phân quyền hệ thống.</p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-colors"
          >
            <span className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 font-bold flex gap-2">
            <span className="material-symbols-outlined">error</span> {error}
          </div>
        )}

        {/* --- USER TABLE CARD --- */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Header Table */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600">group</span>
                Danh sách người dùng
              </h3>
              <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded">
                Total: {users.length}
              </span>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Thêm tài khoản
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-[10%]">ID</th>
                  <th className="px-6 py-4 w-[35%]">Người dùng</th>
                  <th className="px-6 py-4 w-[20%]">Vai trò hiện tại</th>
                  <th className="px-6 py-4 w-[35%] text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => {
                  const currentRole = (u?.roles?.[0]?.role_name || "").toUpperCase();
                  const safeRole = ROLE_ORDER.includes(currentRole) ? currentRole : ROLES.AUTHOR;
                  const isProtected =
                    (u?.email || "").toLowerCase() === "admin@uth.edu.vn" || u?.id === user?.id;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-400">#{u.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                            {getInitials(u.full_name)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{u.full_name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass(safeRole)}`}>
                          {safeRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={isProtected}
                            onClick={() => openEditModal(u)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-md text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Sửa thông tin"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Sửa
                          </button>

                          <button
                            disabled={isProtected}
                            onClick={() => handleDelete(u.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Xóa người dùng"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ CHÈN BẢNG HOẠT ĐỘNG NGAY DƯỚI BẢNG USERS */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-bold dark:text-white">Hoạt động Hệ thống Gần đây</h3>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchActivities}
                disabled={loadingActivities}
                className="text-sm text-gray-500 font-bold hover:underline disabled:opacity-60"
                title="Tải lại hoạt động"
              >
                {loadingActivities ? "Đang tải..." : "Tải lại"}
              </button>

              <button className="text-sm text-primary font-bold hover:underline">Xem tất cả</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-bold uppercase">
                <tr>
                  <th className="px-6 py-4">Người thực hiện</th>
                  <th className="px-6 py-4">Hành động</th>
                  <th className="px-6 py-4">Đối tượng</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4 text-right">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loadingActivities ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">
                      Đang tải hoạt động...
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">
                      Chưa có hoạt động nào
                    </td>
                  </tr>
                ) : (
                  activities.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{log.user_name}</td>
                      <td className="px-6 py-4 text-gray-600">{log.action}</td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                          {log.target || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="material-symbols-outlined text-green-500 text-lg">
                          check_circle
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODAL (DÙNG CHUNG CHO ADD VÀ EDIT) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                {isEditMode ? "Cập nhật thông tin" : "Thêm người dùng mới"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-rose-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all font-medium"
                  placeholder="Nhập tên hiển thị"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all font-medium"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {isEditMode ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"}
                </label>
                <input
                  type="password"
                  required={!isEditMode}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all font-medium"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vai trò</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none font-bold text-gray-700"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value={ROLES.AUTHOR}>AUTHOR (Tác giả)</option>
                  <option value={ROLES.REVIEWER}>REVIEWER (Phản biện)</option>
                  <option value={ROLES.CHAIR}>CHAIR (Trưởng ban)</option>
                  <option value={ROLES.ADMIN}>ADMIN (Quản trị)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-md transition-all disabled:opacity-70 flex justify-center gap-2 items-center"
                >
                  {submitting && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                  )}
                  {submitting ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Tạo User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
