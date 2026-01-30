// src/api/conferenceApi.js
import axiosClient from "./axiosClient";

const SERVICE_PREFIX = "/conference/api/conferences";
const ASSIGNMENTS_PREFIX = "/conference/api/conference-assignments";

const unwrap = (res) => (res?.data !== undefined ? res.data : res);
const normalizeTime = (t) => {
  if (!t) return "";
  return t.length === 5 ? `${t}:00` : t; // HH:MM -> HH:MM:SS
};

const conferenceApi = {
  createConference: async (data) => {
    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("description", data.description || "");
    formData.append("start_date", data.startDate);
    formData.append("start_time", normalizeTime(data.startTime));
    formData.append("end_date", data.endDate);
    formData.append("end_time", normalizeTime(data.endTime));

    if (data.logo instanceof File) formData.append("logo", data.logo);

    const res = await axiosClient.post(`${SERVICE_PREFIX}/`, formData);
    return unwrap(res);
  },

  getAllConferences: async () => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/`);
    return unwrap(res);
  },

  getConferenceById: async (id) => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/${id}`);
    return unwrap(res);
  },

  // ✅ FIX: bỏ CONF_PREFIX, return dữ liệu, thống nhất path
  getAllAssignments: async () => {
    const res = await axiosClient.get(`${ASSIGNMENTS_PREFIX}/`);
    return unwrap(res);
  },

  updateConference: async (id, data) => {
    const formData = new FormData();

    if (data.name !== undefined) formData.append("name", data.name);
    if (data.description !== undefined) formData.append("description", data.description);

    if (data.start_date !== undefined) formData.append("start_date", data.start_date);
    if (data.start_time !== undefined) formData.append("start_time", data.start_time);

    if (data.end_date !== undefined) formData.append("end_date", data.end_date);
    if (data.end_time !== undefined) formData.append("end_time", data.end_time);

    if (data.logo instanceof File) formData.append("logo", data.logo);

    const res = await axiosClient.put(`${SERVICE_PREFIX}/${id}`, formData);
    return unwrap(res);
  },

  deleteConference: async (id) => {
    const res = await axiosClient.delete(`${SERVICE_PREFIX}/${id}`);
    return unwrap(res);
  },

  getTracksByConference: async (conferenceId) => {
    const res = await axiosClient.get(`/conference/api/tracks/conference/${conferenceId}`);
    return unwrap(res);
  },

};

export default conferenceApi;
