import pika
import json
import time
import sys
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ============================================================
# CẤU HÌNH GMAIL (BẠN CẦN SỬA 2 DÒNG DƯỚI)
# ============================================================
SENDER_EMAIL = "qwer2309200c@gmail.com"  # <--- Thay bằng Gmail của bạn
SENDER_PASSWORD = "hwjh gjhg wgam ewfa"     # <--- Dán 16 ký tự App Password vào đây
# ============================================================

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def send_real_email(receiver_email, subject, body):
    try:
        # Tạo nội dung email
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Kết nối tới Gmail Server
        print(f" [.] Connecting to Gmail SMTP...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls() # Mã hóa kết nối (Bắt buộc)
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        
        # Gửi thư
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, receiver_email, text)
        server.quit()
        
        print(f" [V] Email SENT successfully to {receiver_email}")
        return True
    except Exception as e:
        print(f" [!] Failed to send email: {e}")
        return False

def main():
    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    print(f" [*] Connecting to RabbitMQ at {host}...")
    
    # Cơ chế Retry: Thử kết nối lại nếu RabbitMQ chưa bật xong
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=host))
            break
        except pika.exceptions.AMQPConnectionError:
            print(" [!] RabbitMQ not ready, retrying in 5s...")
            time.sleep(5)

    channel = connection.channel()
    queue_name = "notification_queue"
    channel.queue_declare(queue=queue_name, durable=True)

    print(f" [*] Worker started. Waiting for tasks...")

    def callback(ch, method, properties, body):
        try:
            # 1. Giải mã tin nhắn từ RabbitMQ
            message = json.loads(body)
            email_to = message.get('receiver_email')
            subject = message.get('subject', 'Thông báo hệ thống')
            content = message.get('body', '')

            print(f" [x] RECEIVED TASK: Gửi mail cho {email_to}")
            
            # 2. Thực hiện gửi mail thật
            if email_to:
                send_real_email(email_to, subject, content)
            else:
                print(" [!] Error: No receiver email provided")

            # 3. Báo cáo đã xong việc (ACK) để RabbitMQ xóa tin nhắn đi
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except Exception as e:
            print(f" [!] Error processing message: {e}")
            # Nếu lỗi code thì vẫn ACK để tránh loop vô tận (hoặc xử lý Dead Letter sau này)
            ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    channel.start_consuming()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)