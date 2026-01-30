import axiosClient from "./axiosClient";

const reviewDiscussionApi = {
  listByPaperId: (paperId) =>
    axiosClient.get(`/review/discussions/paper/${paperId}`),

  create: (paperId, content, parentId = null) =>
    axiosClient.post(`/review/discussions/`, {
      paper_id: paperId,
      content: content,
      parent_id: parentId,
    }),
};

export default reviewDiscussionApi;