import axiosClient from "./axiosClient";

// ✅ Thống nhất theo backend: APIRouter(prefix="/api/topics")
// ✅ Qua gateway: /conference + /api/topics  => /conference/api/topics
const SERVICE_PREFIX = "/conference/api/topics";

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const topicApi = {
  // ======================
  // CREATE
  // ======================
  createTopic: async (data) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description || "");
    formData.append("track_id", data.track_id);

    // (hiện tại bạn muốn bỏ ảnh thì không append picture)

    const res = await axiosClient.post(`${SERVICE_PREFIX}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return unwrap(res);
  },

  // ======================
  // GET ALL
  // ======================
  getAllTopics: async () => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/`);
    return unwrap(res);
  },

  // ======================
  // GET BY TRACK
  // ======================
  getTopicsByTrack: async (trackId) => {
    const res = await axiosClient.get(
      `${SERVICE_PREFIX}/track/${trackId}`
    );
    return unwrap(res);
  },

  // ======================
  // GET BY ID
  // ======================
  getTopicById: async (id) => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/${id}`);
    return unwrap(res);
  },

  // ======================
  // UPDATE
  // ======================
  updateTopic: async (id, data) => {
    const formData = new FormData();
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.description !== undefined)
      formData.append("description", data.description);

    const res = await axiosClient.put(`${SERVICE_PREFIX}/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return unwrap(res);
  },

  // ======================
  // DELETE
  // ======================
  deleteTopic: async (id) => {
    const res = await axiosClient.delete(`${SERVICE_PREFIX}/${id}`);
    return unwrap(res);
  },
};

export default topicApi;
