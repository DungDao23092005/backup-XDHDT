import axiosClient from "./axiosClient";
const SERVICE_PREFIX = "/conference"; 

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const conferenceApi = {
  getAllConferences: async (params) => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/conferences/`, { params });
    return unwrap(res);
  },

  // Optional: conference detail
  getConferenceById: async (id) => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/conferences/${id}`);
    return unwrap(res);
  },
  

  // 2) List tracks by conference
  getTracksByConference: async (conferenceId) => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/tracks/conference/${conferenceId}`);
    return unwrap(res);
  },

  // 3) List topics by track
  getTopicsByTrack: async (trackId) => {
    const res = await axiosClient.get(`${SERVICE_PREFIX}/topics/track/${trackId}`);
    return unwrap(res);
  },
};

export default conferenceApi;