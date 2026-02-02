
import axiosClient from "./axiosClient";

const NOTIFICATION_PREFIX = "/notification/api/notifications";
const IDENTITY_PREFIX = "/identity/api/users";
const CONFERENCE_PREFIX = "/conference/api/conferences";

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const reviewerApi = {
  getInvitations: async () => {
    const res = await axiosClient.get(`${NOTIFICATION_PREFIX}/reviewer-invitations`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  inviteReviewer: async (payload) => {
    const res = await axiosClient.post(`${NOTIFICATION_PREFIX}/reviewer-invite`, payload);
    return unwrap(res);
  },

  deleteInvitation: async (id) => {
    const res = await axiosClient.delete(`${NOTIFICATION_PREFIX}/reviewer-invitations/${id}`);
    return unwrap(res);
  },

  // reviewer accounts (Admin/Chair)
  getReviewerAccounts: async () => {
    const res = await axiosClient.get(`${IDENTITY_PREFIX}/reviewers`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  getConferences: async () => {
    const res = await axiosClient.get(`${CONFERENCE_PREFIX}/`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

getConferenceDetail: async (id) => {
  const res = await axiosClient.get(`${CONFERENCE_PREFIX}/${id}`);
  return unwrap(res);
},

};

export default reviewerApi;