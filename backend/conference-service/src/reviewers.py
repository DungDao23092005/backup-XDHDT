@router.post("/invite")
def invite_reviewer(
    conference_id: int,
    reviewer_email: str,
    db: Session = Depends(database.get_db)
):
    # 1. Kiểm tra Hội nghị
    conference = db.query(models.Conference).filter(models.Conference.id == conference_id).first()
    if not conference:
        raise HTTPException(status_code=404, detail="Conference not found")

    target_email = reviewer_email.lower().strip()
    # Lấy INTERNAL_KEY từ môi trường (phải khớp với bên Notification Service)
    INTERNAL_KEY = os.getenv("INTERNAL_KEY", "") 

    # 2. Tạo bản ghi Lời mời (hiển thị trong tab 'Lời mời')
    email_payload = {
        "conference_id": conference.id,
        "conference_name": conference.name,
        "conference_time": str(conference.start_date),
        "conference_location": conference.location,
        "reviewer_email": target_email
    }
    requests.post(f"{NOTIFICATION_SERVICE_URL}/reviewer-invite", json=email_payload, timeout=5)

    # 3. Tạo Thông báo hiển thị trong Hộp thư (Inbox)
    reviewer_id = None
    try:
        resp = requests.get(IDENTITY_SERVICE_URL, timeout=5)
        if resp.status_code == 200:
            all_users = resp.json()
            found_user = next((u for u in all_users if str(u.get("email") or "").lower() == target_email), None)
            if found_user:
                reviewer_id = found_user.get("id")
    except Exception as e:
        print(f"Lỗi tìm User: {e}")

    # CHỖ QUAN TRỌNG NHẤT: Gửi thông báo kèm X-Internal-Key
    if reviewer_id:
        notif_payload = {
            "receiver_id": reviewer_id,
            "receiver_email": target_email, # Thêm email để Notification Service gửi mail nếu cần
            "subject": "Lời mời tham gia Ban phản biện",
            "body": f"Bạn nhận được lời mời tham gia Reviewer cho hội nghị: {conference.name}. Vui lòng kiểm tra mục 'Lời mời' để phản hồi.",
            "type": "INVITATION"
        }
        
        try:
            headers = {"X-Internal-Key": INTERNAL_KEY} # Gửi kèm key bảo mật nội bộ
            res = requests.post(
                NOTIFICATION_SERVICE_URL, 
                json=notif_payload, 
                headers=headers, # <--- PHẢI CÓ DÒNG NÀY
                timeout=5
            )
            print(f"Kết quả gửi Inbox: {res.status_code}")
        except Exception as e:
            print(f"Lỗi kết nối Inbox: {e}")

    return {"message": "Reviewer invited successfully"}