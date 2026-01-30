// src/api/reviewerApi.js
import axiosClient from "./axiosClient";

const NOTIFICATION_PREFIX = "/notification/api/notifications";

const reviewerApi = {
  getInvitations: async () => {
    const res = await axiosClient.get(
      `${NOTIFICATION_PREFIX}/reviewer-invitations`
    );
    return res?.data ?? [];
  },

  inviteReviewer: async (payload) => {
    const res = await axiosClient.post(
      `${NOTIFICATION_PREFIX}/reviewer-invite`,
      payload
    );
    return res?.data;
  },

  deleteInvitation: async (id) => {
    const res = await axiosClient.delete(
      `${NOTIFICATION_PREFIX}/reviewer-invitations/${id}`
    );
    return res?.data;
  },
};

export default reviewerApi;