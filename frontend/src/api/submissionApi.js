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

