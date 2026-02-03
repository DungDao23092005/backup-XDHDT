import axiosClient from "./axiosClient";

/**
 * Prefix theo gateway:
 * - notification-service: /notification/api/notifications
 * - identity-service:     /identity/api/users
 * - conference-service:   /conference/api/conferences
 * - submission-service:   /submission/submissions
 * - review-service:       /review/assignments
 * /review/papers
 */
const NOTIFICATION_PREFIX = "/notification/api/notifications";
const IDENTITY_PREFIX = "/identity/api/users";
const CONFERENCE_PREFIX = "/conference/api/conferences";
const TRACK_PREFIX = "/conference/api/tracks";
const TOPIC_PREFIX = "/conference/api/topics";

const SUBMISSION_PREFIX = "/submission/submissions";
const REVIEW_ASSIGNMENT_PREFIX = "/review/assignments";
const REVIEW_PAPER_PREFIX = "/review/papers"; // ✅ Đã thêm prefix cho papers

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const reviewerApi = {
  /* =========================
   * Invitations (Chair/Admin)
   * ========================= */
  getInvitations: async () => {
    const res = await axiosClient.get(`${NOTIFICATION_PREFIX}/reviewer-invitations`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  inviteReviewer: async (payload) => {
    // payload: { reviewer_email, reviewer_name, description?, conference_id? }
    const res = await axiosClient.post(`${NOTIFICATION_PREFIX}/reviewer-invite`, payload);
    return unwrap(res);
  },

  deleteInvitation: async (id) => {
    const res = await axiosClient.delete(`${NOTIFICATION_PREFIX}/reviewer-invitations/${id}`);
    return unwrap(res);
  },

  /* =========================
   * Reviewer accounts (Chair/Admin)
   * ========================= */
  getReviewerAccounts: async () => {
    const res = await axiosClient.get(`${IDENTITY_PREFIX}/reviewers`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  /* =========================
   * Conferences / Tracks / Topics
   * ========================= */
  getConferences: async () => {
    const res = await axiosClient.get(`${CONFERENCE_PREFIX}/`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  getConferenceDetail: async (id) => {
    const res = await axiosClient.get(`${CONFERENCE_PREFIX}/${id}`);
    return unwrap(res);
  },

  // tiện dùng cho trang phân công (nếu muốn gọi trực tiếp từ reviewerApi)
  getTracksByConference: async (conferenceId) => {
    const res = await axiosClient.get(`${TRACK_PREFIX}/conference/${conferenceId}`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  getTopicsByTrack: async (trackId) => {
    const res = await axiosClient.get(`${TOPIC_PREFIX}/track/${trackId}`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  /* =========================
   * Papers for assignment
   * ========================= */
  // Lấy danh sách bài có thể phân công / bidding (submission-service)
  // Endpoint backend: GET /submissions/open-for-bidding
  getOpenPapersForBidding: async () => {
    const res = await axiosClient.get(`${SUBMISSION_PREFIX}/open-for-bidding`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  /* =========================
   * Download Paper (PDF)
   * ========================= */
  
  // 1. Dành cho Reviewer (cần assignment_id để check quyền)
  downloadPaper: async (assignmentId) => {
    return axiosClient.get(`${REVIEW_PAPER_PREFIX}/${assignmentId}/download`, {
      responseType: 'blob', // Quan trọng: trả về file binary
    });
  },

  // 2. Dành cho Chair/Admin (dùng paper_id trực tiếp - Fix lỗi Split View)
  downloadPaperByPaperId: async (paperId) => {
    return axiosClient.get(`${REVIEW_PAPER_PREFIX}/paper/${paperId}/download`, {
      responseType: 'blob',
    });
  },

  /* =========================
   * Assignments (Review service)
   * ========================= */
  // Chair/Admin tạo assignment:
  // payload theo backend review-service schemas.AssignmentCreate:
  // { reviewer_id: number, paper_id: number, is_manual?: boolean, due_date?: string|Date|null }
  createAssignment: async (payload) => {
    const res = await axiosClient.post(`${REVIEW_ASSIGNMENT_PREFIX}/`, payload);
    return unwrap(res);
  },

  // list assignments (chair/reviewer/admin)
  // backend nhận query: reviewer_id, paper_id
  listAssignments: async (params = {}) => {
    const res = await axiosClient.get(`${REVIEW_ASSIGNMENT_PREFIX}/`, { params });
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  listAssignmentsByReviewer: async (reviewerId) => {
    const res = await axiosClient.get(`${REVIEW_ASSIGNMENT_PREFIX}/`, {
      params: { reviewer_id: reviewerId },
    });
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  listAssignmentsByPaper: async (paperId) => {
    const res = await axiosClient.get(`${REVIEW_ASSIGNMENT_PREFIX}/`, {
      params: { paper_id: paperId },
    });
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  getAssignmentDetail: async (assignmentId) => {
    const res = await axiosClient.get(`${REVIEW_ASSIGNMENT_PREFIX}/${assignmentId}`);
    return unwrap(res);
  },

  // helper: tạo hàng loạt assignments (chạy tuần tự để tránh spam request)
  // reviewerIds: number[], paperIds: number[]
  batchCreateAssignments: async ({ reviewerIds = [], paperIds = [], due_date = null, is_manual = true }) => {
    const created = [];
    for (const rid of reviewerIds) {
      for (const pid of paperIds) {
        const payload = {
          reviewer_id: Number(rid),
          paper_id: Number(pid),
          is_manual: !!is_manual,
          due_date: due_date || null,
        };
        const one = await reviewerApi.createAssignment(payload);
        created.push(one);
      }
    }
    return created;
  },
};

export default reviewerApi;