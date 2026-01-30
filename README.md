# UTH Scientific Conference Paper Management System (UTH-ConfMS)

**UTH-ConfMS** là một giải pháp cấp doanh nghiệp (Enterprise-grade) được thiết kế để chuyển đổi số toàn diện quy trình tổ chức và quản lý hội nghị khoa học. Hệ thống áp dụng kiến trúc **Microservices**, đảm bảo khả năng mở rộng (scalability), tính sẵn sàng cao (high availability) và khả năng bảo trì độc lập cho từng phân hệ nghiệp vụ.

---

## Mục lục

- [Tổng quan giải pháp](#tổng-quan-giải-pháp)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
  - [Các thành phần cốt lõi](#các-thành-phần-cốt-lõi)
  - [Luồng giao tiếp tổng quan](#luồng-giao-tiếp-tổng-quan)
- [Technology Stack](#technology-stack)
  - [Backend & Infrastructure](#backend--infrastructure)
  - [Frontend](#frontend)
- [Tính năng nghiệp vụ](#tính-năng-nghiệp-vụ)
  - [Phân hệ Tác giả (Author)](#1-phân-hệ-tác-giả-author)
  - [Phân hệ Phản biện (Reviewer)](#2-phân-hệ-phản-biện-reviewer)
  - [Phân hệ Quản trị (Chair/Admin)](#3-phân-hệ-quản-trị-chairadmin)
- [Cấu trúc Repository](#cấu-trúc-repository)
- [Hướng dẫn triển khai](#hướng-dẫn-triển-khai)
  - [Yêu cầu tiên quyết](#yêu-cầu-tiên-quyết)
  - [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường)
  - [Chạy hệ thống với Docker Compose](#chạy-hệ-thống-với-docker-compose)
  - [Kiểm tra tình trạng hệ thống](#kiểm-tra-tình-trạng-hệ-thống)
  - [Dừng hệ thống](#dừng-hệ-thống)
- [Tài liệu API](#tài-liệu-api)
- [Operational Notes](#operational-notes)
  - [Ports & Endpoints](#ports--endpoints)
  - [Healthcheck](#healthcheck)
  - [Logging](#logging)
  - [Security](#security)
- [Đội ngũ phát triển](#đội-ngũ-phát-triển)
- [License](#license)

---

## Tổng quan giải pháp

Hệ thống giải quyết bài toán phân mảnh dữ liệu và quy trình thủ công trong tổ chức hội nghị khoa học tại các trường đại học. UTH-ConfMS cung cấp một luồng làm việc khép kín (End-to-End Workflow) từ giai đoạn **Call for Papers (CFP)** đến **Xuất bản kỷ yếu (Proceedings)**.

**Điểm nổi bật:**

- **Standardized Workflow:** Tuân thủ quy trình xét duyệt quốc tế (tương tự EasyChair).
- **Data Integrity:** Loại bỏ dư thừa dữ liệu nhờ mô hình Database-per-service.
- **Security:** Cơ chế xác thực tập trung (SSO) và phân quyền RBAC đa cấp độ.
- **AI-Powered:** Tích hợp AI để hỗ trợ kiểm tra thể thức và gợi ý phản biện.

---

## Kiến trúc hệ thống

Dự án được xây dựng dựa trên mẫu kiến trúc **Microservices**, giao tiếp qua RESTful APIs và được điều phối bởi một **API Gateway** trung tâm.

### Các thành phần cốt lõi

| Service | Port | Mô tả kỹ thuật |
| --- | --- | --- |
| **API Gateway (Nginx)** | `8080` | Reverse Proxy, Load Balancing, SSL Termination (tuỳ môi trường), CORS Handling. |
| **Identity Service** | `8005` | Quản lý Users, Authentication (JWT), Authorization (RBAC). |
| **Conference Service** | `8002` | Quản lý cấu hình hội nghị, Tracks, Topics, CFP settings. |
| **Submission Service** | `8000` | Xử lý nộp bài, Versioning cho PDF, File Storage management. |
| **Review Service** | `8003` | Quy trình phản biện, Bidding, Scoring, Conflict of Interest (COI). |
| **Notification Service** | `8001` | Gửi email bất đồng bộ (SMTP), quản lý Templates. |
| **Intelligent Service** | `8004` | AI Module: NLP processing, Summarization, Reviewer Recommendation. |
| **Frontend App** | `3000` | SPA với ReactJS. |

### Luồng giao tiếp tổng quan

- Người dùng truy cập **Frontend (React)**.
- Frontend gọi API thông qua **API Gateway (Nginx)** tại `:8080`.
- Gateway định tuyến request tới đúng service theo path prefix (ví dụ `/identity`, `/submission`, ...).
- Mỗi service sở hữu database riêng (Database-per-service), giảm coupling và tăng tính độc lập triển khai.

---

## Technology Stack

### Backend & Infrastructure

- **Core Framework:** Python (FastAPI/Flask) — hỗ trợ hiệu năng cao, có khả năng AsyncIO (tuỳ service).
- **Database:** MySQL 8.0 (Database-per-service).
- **Containerization:** Docker & Docker Compose.
- **Gateway/Proxy:** Nginx (Alpine Linux).
- **Authentication:** OAuth2 / JWT (JSON Web Tokens).

### Frontend

- **Library:** ReactJS
- **State Management:** Context API / Redux (tuỳ implementation)
- **Styling:** CSS Modules / Styled-components
- **Networking:** Axios (kèm Interceptors xử lý Token)

---

## Tính năng nghiệp vụ

### 1. Phân hệ Tác giả (Author)

- **Dashboard thông minh:** Theo dõi trạng thái bài nộp theo thời gian thực.
- **Submission Workflow:** Nộp bài (PDF), chỉnh sửa metadata, nộp bản Camera-ready.
- **AI Assistance:** Kiểm tra lỗi ngữ pháp và format trước khi nộp.

### 2. Phân hệ Phản biện (Reviewer)

- **Bidding System:** Chọn bài dựa trên chuyên môn.
- **Conflict of Interest (COI):** Cơ chế tự động phát hiện và khai báo xung đột lợi ích.
- **Evaluation:** Chấm điểm theo tiêu chí (Rubrics), để lại comments ẩn danh.

### 3. Phân hệ Quản trị (Chair/Admin)

- **Conference Setup:** Cấu hình Tracks, PC Members, Deadlines.
- **Assignment:** Phân công phản biện (thủ công hoặc tự động).
- **Decision Making:** Ra quyết định Accept/Reject dựa trên điểm số tổng hợp.
- **Audit Logs:** Ghi vết toàn bộ thao tác hệ thống.

---

## Cấu trúc Repository

Cấu trúc thư mục được tổ chức theo mô hình Monorepo để dễ dàng quản lý mã nguồn:

```bash
UTH-ConfMS/
├── backend/                  # Mã nguồn các Microservices
│   ├── conference-service/   # Service Hội nghị
│   ├── identity-service/     # Service Định danh
│   ├── submission-service/   # Service Bài nộp
│   ├── review-service/       # Service Phản biện
│   ├── notification-service/ # Service Thông báo
│   └── intelligent-service/  # Service AI
├── frontend/                 # Mã nguồn ReactJS Application
├── gateway/                  # Cấu hình Nginx API Gateway
├── docker-compose.yml        # Orchestration cho môi trường Dev
└── README.md                 # Tài liệu dự án
```

## Hướng dẫn triển khai
### Yêu cầu tiên quyết
- Docker Desktop (v20.10+)
- Git
### Cấu hình biến môi trường
Hệ thống sử dụng cơ chế biến môi trường tập trung. Tạo file .env tại thư mục gốc từ file mẫu:
```bash
cp .env.example .env
# Lưu ý: cập nhật các thông tin credentials (DB_PASSWORD, SECRET_KEY, SMTP,...) trong file .env
```
Khuyến nghị:
- Không commit .env lên git.
- Với môi trường production, sử dụng secrets manager hoặc CI/CD secret variables.
Chạy hệ thống với Docker Compose
Clone và chạy hệ thống:
```bash
git clone https://github.com/NHTung-0801/UTH-Scientific-Conference-Paper-Management-System.git
cd UTH-Scientific-Conference-Paper-Management-System
docker-compose up -d --build
```
Kiểm tra tình trạng hệ thống:
```bash
docker-compose ps
```
Đảm bảo tất cả các services đều ở trạng thái Up (và healthy nếu có khai báo healthcheck).
Dừng hệ thống
```bash
docker-compose down
```
