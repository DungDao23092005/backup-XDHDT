import axiosClient from "./axiosClient";

export async function listMySubmissions() {
  const res = await axiosClient.get("/submission/submissions");
  return res.data;
}

export async function submitPaper({ metadata, file }) {
  const fd = new FormData();
  fd.append("metadata", JSON.stringify(metadata));
  fd.append("file", file);

  const res = await axiosClient.post("/submission/submissions/", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function listOpenPapersForBidding() {
  const res = await axiosClient.get("/submission/submissions/open-for-bidding");
  return res.data;
}

export async function getPaperForReviewer(paperId) {
  const papers = await listOpenPapersForBidding();
  const found = (papers || []).find((p) => Number(p.id) === Number(paperId));
  return found || null;
}
