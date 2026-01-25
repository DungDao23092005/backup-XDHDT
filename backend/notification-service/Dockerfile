# 1. Chọn Base Image (Python 3.10 bản nhẹ)
FROM python:3.10-slim

# 2. Thiết lập thư mục làm việc trong container
WORKDIR /app

# 3. Copy file requirements và cài thư viện
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy toàn bộ mã nguồn vào container
COPY src/ ./src/
COPY .env .

# 5. Mở port 8000
EXPOSE 8000

# 6. Lệnh chạy server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]