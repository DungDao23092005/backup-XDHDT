// src/api/reviewApi.js
import axiosClient from "./axiosClient";

/**
 * Extract user_id from JWT stored in localStorage.access_token
 * Returns null if token missing/invalid.
 */
const getUserIdFromToken = () => {
  const t = localStorage.getItem("access_token");
  if (!t) return null;

  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload?.user_id ?? null;
  } catch (e) {
    return null;
  }
};

const reviewApi = {
  /* ================= ASSIGNMENTS ================= */
  listAssignments: (params = {}) => axiosClient.get("/review/assignments/", { params }),

  // My assignments: always filter by current logged-in user_id when available
  listMyAssignments: () => {
    const uid = getUserIdFromToken();
    return axiosClient.get("/review/assignments/", {
      params: uid ? { reviewerId: uid } : {},
    });
  },

  getAssignment: (id) => axiosClient.get(`/review/assignments/${id}`),

  updateAssignment: (id, payload) => axiosClient.patch(`/review/assignments/${id}`, payload),

  acceptAssignment: (id) => axiosClient.post(`/review/assignments/${id}/accept`),

  declineAssignment: (id) => axiosClient.post(`/review/assignments/${id}/decline`),

  /* ================= COI ================= */
  listCOI: (params = {}) => axiosClient.get("/review/coi/", { params }),

  // My COI: filter by current logged-in user_id when available
  listMyCOI: () => {
    const uid = getUserIdFromToken();
    return axiosClient.get("/review/coi/", {
      params: uid ? { reviewerId: uid } : {},
    });
  },

  declareCOI: (payload) => axiosClient.post("/review/coi/", payload),

  /* ================= REVIEWS ================= */
  listReviews: ({ assignmentId }) =>
    axiosClient.get("/review/reviews/", {
      params: { assignment_id: assignmentId },
    }),

  getReview: (id) => axiosClient.get(`/review/reviews/${id}`),

  createReview: (payload) => axiosClient.post("/review/reviews/", payload),

  updateReview: (id, payload) => axiosClient.patch(`/review/reviews/${id}`, payload),

  addCriteria: (reviewId, payload) => axiosClient.post(`/review/reviews/${reviewId}/criterias`, payload),

  updateCriteria: (reviewId, criteriaId, payload) =>
    axiosClient.patch(`/review/reviews/${reviewId}/criterias/${criteriaId}`, payload),

  submitReview: (reviewId) => axiosClient.post(`/review/reviews/${reviewId}/submit`),

  /* ================= PAPERS ================= */
  getPaperPdfUrlByAssignment: (assignmentId) => axiosClient.get(`/review/papers/${assignmentId}/pdf-url`),

  /* ================= DISCUSSIONS ================= */
  listDiscussionsByPaper: (paperId) => axiosClient.get(`/review/discussions/paper/${paperId}`),

  createDiscussion: (payload) => axiosClient.post("/review/discussions/", payload),
};

export default reviewApi;
