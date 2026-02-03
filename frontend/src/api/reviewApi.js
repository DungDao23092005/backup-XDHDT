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

const normalizeStatus = (val) => String(val?.value ?? val ?? "").trim().toLowerCase();

/**
 * Helper: find OPEN COI for current user and a paper_id
 * Returns COI object or null
 */
const findMyOpenCOIByPaperId = async (paperId) => {
  const uid = getUserIdFromToken();

  // backend coi.py nhận paper_id, reviewer_id (snake_case)
  // reviewer_id sẽ bị override theo token nếu là REVIEWER, nhưng gửi vẫn ok
  const res = await axiosClient.get("/review/coi/", {
    params: {
      paper_id: paperId,
      reviewer_id: uid ?? undefined,
    },
  });

  const list = res.data || [];
  const open = list.find((x) => normalizeStatus(x.status) === "open");
  return open || null;
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

  // Alias để match ReviewWorkspace.jsx cũ
  getAssignmentDetail: (id) => axiosClient.get(`/review/assignments/${id}`),

  updateAssignment: (id, payload) => axiosClient.patch(`/review/assignments/${id}`, payload),

  acceptAssignment: (id) => axiosClient.post(`/review/assignments/${id}/accept`),

  declineAssignment: (id) => axiosClient.post(`/review/assignments/${id}/decline`),

  /* ================= COI ================= */
  listCOI: (params = {}) => axiosClient.get("/review/coi/", { params }),

  // My COI: backend coi.py nhận reviewer_id (snake_case)
  listMyCOI: () => {
    const uid = getUserIdFromToken();
    return axiosClient.get("/review/coi/", {
      params: uid ? { reviewer_id: uid } : {},
    });
  },

  // list COI theo paper (reviewer sẽ bị override theo token)
  listMyCOIByPaper: (paperId) =>
    axiosClient.get("/review/coi/", {
      params: { paper_id: paperId },
    }),

  declareCOI: (payload) => axiosClient.post("/review/coi/", payload),

  updateCOI: (coiId, payload = {}) => axiosClient.patch(`/review/coi/${coiId}`, payload),

  /**
   * Convenience: resolve my OPEN COI for a paper_id (if exists)
   * Backend PATCH /review/coi/{coi_id} (reviewer) sẽ auto set Resolved
   */
  resolveMyOpenCOIByPaperId: async (paperId, payload = {}) => {
    const open = await findMyOpenCOIByPaperId(paperId);
    if (!open) return null;
    const res = await axiosClient.patch(`/review/coi/${open.id}`, payload);
    return res.data;
  },

  /* ================= REVIEWS ================= */
  listReviews: ({ assignmentId }) =>
    axiosClient.get("/review/reviews/", {
      params: { assignment_id: assignmentId },
    }),

  getReview: (id) => axiosClient.get(`/review/reviews/${id}`),

  createReview: (payload) => axiosClient.post("/review/reviews/", payload),

  updateReview: (id, payload) => axiosClient.patch(`/review/reviews/${id}`, payload),

  addCriteria: (reviewId, payload) =>
    axiosClient.post(`/review/reviews/${reviewId}/criterias`, payload),

  updateCriteria: (reviewId, criteriaId, payload) =>
    axiosClient.patch(`/review/reviews/${reviewId}/criterias/${criteriaId}`, payload),

  submitReview: (reviewId) => axiosClient.post(`/review/reviews/${reviewId}/submit`),

  /* ================= PAPERS ================= */
  getPaperPdfUrlByAssignment: (assignmentId) =>
    axiosClient.get(`/review/papers/${assignmentId}/pdf-url`),

  // ✅ [REVIEWER] Tải file PDF thông qua Assignment (cần check quyền sở hữu assignment)
  downloadPaper: (assignmentId) => {
    return axiosClient.get(`/review/papers/${assignmentId}/download`, {
      responseType: 'blob', // Quan trọng: báo cho axios biết server trả về file binary
    });
  },

  // ✅ [CHAIR/ADMIN] Tải file PDF trực tiếp bằng Paper ID (dùng cho Split View / Monitor)
  downloadPaperByPaperId: (paperId) => {
    return axiosClient.get(`/review/papers/paper/${paperId}/download`, {
      responseType: 'blob',
    });
  },

  /* ================= DISCUSSIONS ================= */
  listDiscussionsByPaper: (paperId) => axiosClient.get(`/review/discussions/paper/${paperId}`),

  createDiscussion: (payload) => axiosClient.post("/review/discussions/", payload),

  /* ================= HELPERS ================= */
  getUserIdFromToken,
};

export default reviewApi;