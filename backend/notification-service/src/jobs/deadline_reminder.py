# notification_service/jobs/deadline_reminder.py
from datetime import datetime, timedelta, timezone
from .models import NotificationPrefs

REMIND_DAYS = 3

def run_deadline_reminders(db, conference_client, submission_client, mailer, message_repo):
    now = datetime.now(timezone.utc)
    target_from = now + timedelta(days=REMIND_DAYS)
    target_to = target_from + timedelta(hours=24)

    # 1) lấy conferences có deadline trong khoảng target
    deadlines = conference_client.list_deadlines_between(target_from, target_to)

    for d in deadlines:
        user_ids = submission_client.list_author_ids_by_conference(d["conference_id"])

        # 3) lọc user bật reminder
        prefs = db.query(NotificationPrefs).filter(
            NotificationPrefs.user_id.in_(user_ids),
            NotificationPrefs.deadline_reminder == True
        ).all()
        enabled_ids = {p.user_id for p in prefs}

        for uid in enabled_ids:
            subject = f"Nhắc nhở hạn chót: {d['title']}"
            body = f"Hạn {d['type']} sẽ đến vào {d['deadline_at']}. Vui lòng hoàn tất trước hạn."
            message_repo.create(user_id=uid, subject=subject, body=body)
            # 5) gửi email (nếu muốn)
            mailer.send_to_user(uid, subject, body)
