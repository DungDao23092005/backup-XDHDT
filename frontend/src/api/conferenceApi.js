import axiosClient from "./axiosClient";

// URL của Conference Service (Lấy từ biến môi trường hoặc hardcode tạm để test)
// Ví dụ: http://localhost:8000
const CONFERENCE_URL = process.env.REACT_APP_CONFERENCE_URL || "http://localhost:8000"; 

const conferenceApi = {
    // Lấy danh sách hội nghị (có thể thêm params limit để lấy 3-4 cái mới nhất)
    getAll: (params) => {
        return axiosClient.get(`${CONFERENCE_URL}/conferences`, { params });
    },

    // Lấy chi tiết 1 hội nghị theo ID
    getById: (id) => {
        return axiosClient.get(`${CONFERENCE_URL}/conferences/${id}`);
    }
};

export default conferenceApi;