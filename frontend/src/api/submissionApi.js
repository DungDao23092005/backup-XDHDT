// submissionApi.js
import axiosClient from "./axiosClient";

const BASE = "/submission/submissions";

// axiosClient đã unwrap response.data rồi => ở đây return thẳng
export async function listMySubmissions() {
  return axiosClient.get(BASE);
}

export async function submitPaper({ metadata, file }) {
  const fd = new FormData();
  fd.append("metadata", JSON.stringify(metadata));
  fd.append("file", file);

  return axiosClient.post(`${BASE}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export const updatePaperDetails = (paperId, updateData) => {
  return axiosClient.put(`${BASE}/${paperId}`, updateData);
};

export const getSubmissionById = (paperId) => {
  return axiosClient.get(`${BASE}/${paperId}`);
};

export const withdrawSubmission = (paperId) => {
  return axiosClient.post(`${BASE}/${paperId}/withdraw`);
};

export const addSubmissionAuthor = (paperId, authorData) => {
  return axiosClient.post(`${BASE}/${paperId}/authors`, authorData);
};

export const deleteSubmissionAuthor = (paperId, authorId) => {
  return axiosClient.delete(`${BASE}/${paperId}/authors/${authorId}`);
};

export const uploadNewVersion = ({ paperId, file }) => {
  const fd = new FormData();
  fd.append("file", file);

  return axiosClient.post(`${BASE}/${paperId}/file`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadCameraReady = ({ paperId, file }) => {
  const fd = new FormData();
  fd.append("file", file);

  return axiosClient.post(`${BASE}/${paperId}/camera-ready`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateSubmissionAuthor = (paperId, authorId, authorData) => {
  return axiosClient.put(`${BASE}/${paperId}/authors/${authorId}`, authorData);
};

export async function listOpenForBidding() {
  return axiosClient.get(`${BASE}/open-for-bidding`);
}