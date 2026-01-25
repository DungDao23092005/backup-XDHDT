import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import conferenceApi from '../../api/conferenceApi';

const ConferenceDetail = () => {
    const { id } = useParams(); // Lấy ID từ URL
    const [conference, setConference] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Giả lập call API lấy chi tiết
        // Thực tế: const res = await conferenceApi.getById(id);
        setTimeout(() => {
            setConference({
                id: id,
                title: "Hội nghị CNTT & Chuyển đổi số 2025",
                description: "Hội nghị thường niên về các công nghệ mới nổi, AI, Big Data và ứng dụng trong giao thông vận tải.",
                date: "20/11/2025",
                location: "Hội trường A - Đại học Giao thông Vận tải TP.HCM",
                organizer: "Khoa CNTT - UTH",
                tracks: ["Trí tuệ nhân tạo", "Dữ liệu lớn", "An toàn thông tin", "IoT trong Giao thông"],
                contact: "conf@uth.edu.vn"
            });
            setLoading(false);
        }, 500);
    }, [id]);

    if (loading) return <div className="text-center mt-5">Đang tải thông tin...</div>;
    if (!conference) return <div className="text-center mt-5">Không tìm thấy hội nghị!</div>;

    return (
        <div className="container py-5">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Chi tiết hội nghị</li>
                </ol>
            </nav>

            <div className="row mt-4">
                {/* Cột Trái: Thông tin chính */}
                <div className="col-lg-8">
                    <h1 className="fw-bold text-danger mb-3">{conference.title}</h1>
                    <div className="mb-4 text-muted">
                        <i className="bi bi-calendar3 me-2"></i>{conference.date} &nbsp;|&nbsp; 
                        <i className="bi bi-geo-alt-fill me-2 ms-3"></i>{conference.location}
                    </div>

                    <div className="mb-4">
                        <h4 className="border-bottom pb-2">Giới thiệu</h4>
                        <p className="text-justify">{conference.description}</p>
                    </div>

                    <div className="mb-4">
                        <h4 className="border-bottom pb-2">Chủ đề (Tracks)</h4>
                        <ul>
                            {conference.tracks.map((track, idx) => (
                                <li key={idx}>{track}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Cột Phải: Sidebar thông tin & Hành động */}
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-body">
                            <h5 className="card-title text-danger fw-bold">Tham gia nộp bài</h5>
                            <p className="small text-muted">Hạn chót nộp bài đang đến gần.</p>
                            <Link to="/login" className="btn btn-primary w-100 mb-2">
                                Nộp bài ngay (Login)
                            </Link>
                            <button className="btn btn-outline-secondary w-100">
                                <i className="bi bi-download me-2"></i>Tải Call for Papers
                            </button>
                        </div>
                    </div>

                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h6 className="fw-bold">Liên hệ Ban tổ chức</h6>
                            <p className="mb-1"><strong>Đơn vị:</strong> {conference.organizer}</p>
                            <p className="mb-0"><strong>Email:</strong> {conference.contact}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConferenceDetail;