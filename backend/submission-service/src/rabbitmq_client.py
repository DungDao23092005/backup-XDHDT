# Đường dẫn: backend/submission-service/src/rabbitmq_client.py

import pika
import json
import os

# Lấy host từ biến môi trường
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
QUEUE_NAME = "notification_queue"

def publish_message(message: dict):
    try:
        # 1. Tạo kết nối
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()

        # 2. Khai báo hàng đợi (để chắc chắn nó tồn tại)
        channel.queue_declare(queue=QUEUE_NAME, durable=True)

        # 3. Gửi tin nhắn
        channel.basic_publish(
            exchange='',
            routing_key=QUEUE_NAME,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Persistent (Lưu tin nhắn vào ổ cứng)
            ))
        
        print(f" [x] Sent message to RabbitMQ: {message}")
        connection.close()
    except Exception as e:
        print(f" [!] Error connecting to RabbitMQ: {e}")