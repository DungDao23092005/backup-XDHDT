from kafka import KafkaConsumer
import json
import os
import sys
import time

def main():
    kafka_host = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    topic_name = "system_logs"

    print(f" [Kafka Worker] Connecting to {kafka_host}...")
    
    # Retry kết nối
    consumer = None
    while True:
        try:
            consumer = KafkaConsumer(
                topic_name,
                bootstrap_servers=[kafka_host],
                auto_offset_reset='latest',
                enable_auto_commit=True,
                group_id='logging-group',
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )
            print(" [Kafka Worker] Connected! Waiting for logs...")
            break
        except Exception:
            print(" [Kafka Worker] Retrying connection in 5s...")
            time.sleep(5)

    for message in consumer:
        log_data = message.value
        # Giả lập hành động ghi log vào file hoặc ElasticSearch
        print(f" =========================================")
        print(f" [LOGGING SERVICE] New Event Received:")
        print(f" TYPE: {log_data.get('type')}")
        print(f" DETAIL: {log_data.get('details')}")
        print(f" =========================================")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)