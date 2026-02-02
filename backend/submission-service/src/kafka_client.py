from kafka import KafkaProducer
import json
import os

KAFKA_SERVER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
TOPIC_LOGS = "system_logs"

def get_kafka_producer():
    try:
        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_SERVER],
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        return producer
    except Exception:
        return None

def log_activity(activity_type, details):
    """
    Hàm này dùng để bắn log vào Kafka
    """
    try:
        producer = get_kafka_producer()
        if producer:
            message = {
                "type": activity_type,
                "details": details,
                "timestamp": str(os.times())
            }
            producer.send(TOPIC_LOGS, value=message)
            producer.flush()
            print(f" [Kafka] Log sent: {activity_type}")
    except Exception as e:
        print(f" [!] Kafka Error: {e}")