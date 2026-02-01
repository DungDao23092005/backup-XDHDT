import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base

# Import router cũ (các tính năng chung)
from .router import router as old_router
# Import router mới (Analysis)
from . import analysis 

# Tạo bảng database nếu chưa có
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UTH Conference Intelligent Service",
    description="AI Microservice using Google Gemini",
    version="1.0.0",
    # 👇 QUAN TRỌNG: Cấu hình root_path để Swagger UI hoạt động đúng sau Nginx
    root_path="/intelligent" 
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Router cũ (Giữ nguyên prefix để tương thích code cũ nếu cần)
# URL thực tế qua Gateway: /intelligent/intelligent/author/refine ...
app.include_router(old_router, prefix="/intelligent", tags=["AI General Features"])

# 2. Router mới (AI Analysis)
# 👇 URL thực tế qua Gateway: /intelligent/papers/{paper_id}/analyze
app.include_router(analysis.router, prefix="/papers", tags=["AI Analysis"]) 

@app.get("/")
def health_check():
    return {"status": "ok", "service": "intelligent-service"}