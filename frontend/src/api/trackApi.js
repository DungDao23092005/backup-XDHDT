import axiosClient from "./axiosClient";

// ✅ Thống nhất theo backend: APIRouter(prefix="/api/tracks")
// ✅ Qua gateway: /conference + /api/tracks  => /conference/api/tracks
const SERVICE_PREFIX = "/conference/api/tracks";

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const trackApi = {
  // CREATE
  createTrack: async (data) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description || "");
    formData.append("conference_id", data.conferenceId);

    // nếu sau này bạn upload logo
    if (data.logo instanceof File) {
      formData.append("logo", data.logo);
    }

    const res = await axiosClient.post(`${SERVICE_PREFIX}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return unwrap(res);
  },

  // GET ALL
  getAllTracks: async () => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/`);
    return unwrap(res);
  },

  // ✅ GET BY CONFERENCE (cái bạn đang cần cho trang chi tiết hội nghị)
  getTracksByConferenceId: async (conferenceId) => {
    const res = await axiosClient.get(
      `${SERVICE_PREFIX}/conference/${conferenceId}`
    );
    return unwrap(res);
  },

  // GET BY ID
  getTrackById: async (id) => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/${id}`);
    return unwrap(res);
  },

  // UPDATE
  updateTrack: async (id, data) => {
    const formData = new FormData();
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.description !== undefined) formData.append("description", data.description);

    if (data.logo instanceof File) {
      formData.append("logo", data.logo);
    }

    const res = await axiosClient.put(`${SERVICE_PREFIX}/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return unwrap(res);
  },

  // DELETE
  deleteTrack: async (id) => {
    const res = await axiosClient.delete(`${SERVICE_PREFIX}/${id}`);
    return unwrap(res);
  },
};

export default trackApi;
