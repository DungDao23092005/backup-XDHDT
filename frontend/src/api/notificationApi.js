import axiosClient from "./axiosClient";

const NOTI_PREFIX = process.env.REACT_APP_NOTIFICATION_PREFIX || "";

const notificationApi = {
  getMyInbox: () => axiosClient.get(`${NOTI_PREFIX}/api/notifications/me`),
  markRead: (id) => axiosClient.put(`${NOTI_PREFIX}/api/notifications/${id}/read`),
};

export default notificationApi;
