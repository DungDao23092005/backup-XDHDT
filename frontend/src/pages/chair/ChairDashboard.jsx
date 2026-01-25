import React from 'react';
import { useAuth } from '../../context/AuthContext';

const ChairDashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="text-primary">Dashboard Trưởng Ban (Chair)</h2>
                    <p className="text-muted">Xin chào, {user?.full_name || user?.sub}!</p>
                </div>
                <button onClick={logout} className="btn btn-outline-danger">Đăng xuất</button>
            </div>

            <div className="row">
                <div className="col-md-6">
                    <div className="card mb-3 border-primary h-100">
                        <div className="card-header bg-primary text-white">Thống kê hội nghị</div>
                        <div className="card-body">
                            <h5 className="card-title">Tổng quan</h5>
                            <p className="card-text fs-4">15 <span className="fs-6 text-muted">bài nộp</span></p>
                            <button className="btn btn-primary btn-sm">Xem chi tiết</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card mb-3 border-primary h-100">
                        <div className="card-header bg-primary text-white">Phân công Review</div>
                        <div className="card-body">
                            <h5 className="card-title">Cần xử lý</h5>
                            <p className="card-text text-danger fw-bold">3 bài chưa phân công</p>
                            <button className="btn btn-outline-primary btn-sm">Phân công ngay</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChairDashboard;