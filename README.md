🎓 Hệ thống quản lý bài báo Hội nghị Khoa học UTH (UTH-ConfMS)

Hệ thống quản lý quy trình tổ chức và nộp bài cho Hội nghị Nghiên cứu khoa học tại trường ĐH UTH

📖 Mục lục

Giới thiệu dự án

Kiến trúc hệ thống

Công nghệ sử dụng

Tính năng chính

Tiến độ & Nhiệm vụ

Cài đặt & Triển khai

Tài liệu & Quản lý

Thành viên nhóm

💡 Giới thiệu dự án

UTH-ConfMS là một nền tảng toàn diện được thiết kế để chuẩn hóa và tự động hóa quy trình tổ chức các hội nghị nghiên cứu khoa học tại Đại học UTH.

🚩 Vấn đề hiện tại

Hiện nay, các khoa thường tổ chức hội nghị một cách rời rạc, sử dụng nhiều công cụ bên ngoài không đồng nhất. Điều này dẫn đến:

Dữ liệu bị trùng lặp, không thống nhất về định dạng (template).

Thông tin liên lạc bị phân tán (email, zalo, web riêng).

Khó kiểm soát xung đột lợi ích (COI) trong quá trình phản biện.

Thiếu báo cáo tổng hợp tập trung cho nhà trường.

🎯 Giải pháp của chúng tôi

UTH-ConfMS cung cấp một luồng làm việc khép kín theo phong cách EasyChair, thống nhất mọi hoạt động:
Kêu gọi viết bài (CFP) ➔ Nộp bài ➔ Phản biện ➔ Quyết định ➔ Bản in hoàn thiện (Camera-ready) ➔ Xuất bản kỷ yếu

Hệ thống đảm bảo phân quyền chặt chẽ (RBAC), đăng nhập một lần (SSO), và tích hợp công cụ AI hỗ trợ nâng cao chất lượng bài viết và quy trình xét duyệt.

🏗 Kiến trúc hệ thống

Dự án được triển khai theo Kiến trúc hướng dịch vụ (SOA) và mẫu Microservices để đảm bảo khả năng mở rộng và bảo trì dễ dàng.

Các dịch vụ chính (Microservices):

Identity Service: Xác thực, SSO, Phân quyền (RBAC).

Conference Service: Cấu hình hội nghị, Tracks, Chủ đề, tạo CFP.

Submission Service: Quản lý bài nộp, Phiên bản (Version control), Xử lý file PDF.

Review Service: Phân công phản biện, Chấm điểm, Thảo luận, Phát hiện xung đột lợi ích (COI).

Notification Service: Quản lý mẫu Email, Gửi mail hàng loạt (SMTP).

AI Integration Service: Kiểm tra ngữ pháp, Tóm tắt bài báo, Gợi ý phản biện.

(Chèn sơ đồ kiến trúc hệ thống tại đây, ví dụ: )

🛠 Công nghệ sử dụng

Client-side (Giao diện)

Server-side (Backend)

Cơ sở dữ liệu & Hạ tầng

🚀 Tính năng chính


🤵 Tác giả (Author)

Đăng ký/Đăng nhập (SSO), Nộp/Rút bài báo, Xem kết quả phản biện, Nộp bản Camera-ready. 



 ✨ AI hỗ trợ: Kiểm tra ngữ pháp & Gợi ý từ khóa.

🕵️ Phản biện (Reviewer)

Xem bài được phân công, Chấm điểm, Thảo luận kín với hội đồng, Khai báo xung đột lợi ích. 



 ✨ AI hỗ trợ: Tóm tắt nội dung bài báo & Trích xuất ý chính.

🎓 Chủ tịch (Chair)

Cấu hình Tracks, Mời phản biện, Phân công bài (Tự động/Thủ công), Ra quyết định duyệt bài. 



 ✨ AI hỗ trợ: Soạn thảo email thông báo tự động.

⚙️ Quản trị (Admin)

Cấu hình hệ thống, Cài đặt SMTP, Xem nhật ký hoạt động (Audit logs), Quản lý người dùng.

📅 Tiến độ & Nhiệm vụ

Dự án tuân thủ phương pháp Agile với thời gian phát triển 8 tuần (ước tính ~400 giờ làm việc).

[ ] TP1: Nền tảng Admin & Quản trị (RBAC, Tenancy, Audit).

[ ] TP2: Thiết lập Hội nghị & Kêu gọi viết bài (CFP).

[ ] TP3: Module Nộp bài (Dashboard cho tác giả).

[ ] TP4: Quản lý Hội đồng & Mời phản biện.

[ ] TP5: Quy trình Phản biện & Thảo luận nội bộ.

[ ] TP6: Ra quyết định & Hệ thống thông báo.

[ ] TP7: Nộp bản in hoàn thiện (Camera-ready) & Xuất kỷ yếu.

[ ] TP8: Triển khai (Docker) & Kiểm thử hệ thống (System Testing).

[ ] TP9: Tài liệu hóa (Phân tích, Thiết kế, Hướng dẫn sử dụng).

💻 Cài đặt & Triển khai

Yêu cầu tiên quyết

Docker Desktop đã được cài đặt.

Git đã được cài đặt.

Các bước cài đặt

Clone mã nguồn từ GitHub

git clone [https://github.com/NHTung-0801/UTH-Scientific-Conference-Paper-Management-System.git](https://github.com/NHTung-0801/UTH-Scientific-Conference-Paper-Management-System.git)
cd UTH-Scientific-Conference-Paper-Management-System


Cấu hình môi trường
Tạo file .env tại thư mục gốc dựa trên file mẫu .env.example.

Khởi chạy với Docker Compose

docker-compose up -d --build


Truy cập hệ thống

Frontend: http://localhost:3000

API Gateway: http://localhost:8000

API Docs (Swagger): http://localhost:8000/swagger

📚 Tài liệu & Quản lý

Nhóm sử dụng các công cụ tiêu chuẩn để quản lý dự án:

📘 Confluence: Link tài liệu dự án (SRS, SDD)

📋 Jira: Link bảng quản lý tác vụ (Kanban/Scrum)

🎨 Figma: Link thiết kế UI/UX

👥 Thành viên nhóm

MSSV  Họ và Tên  Vai trò  GitHub   Leader



📝 Giấy phép (License)

Được phân phối dưới giấy phép MIT. Xem file LICENSE để biết thêm thông tin.

Dự án này là một phần của Đồ án Tốt nghiệp tại Đại học UTH.