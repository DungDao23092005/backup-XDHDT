import axiosClient from "./axiosClient";

const bidApi = {
  getOpenPapers: () => {
    return axiosClient.get("/review/bids/open-papers");
  },
  
  submitBid: (data) => {
    return axiosClient.post("/review/bids/", data);
  },
};

export default bidApi;