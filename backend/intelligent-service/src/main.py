from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base

# 👇 Import Router CŨ (File src/router.py của bạn)
from .router import router as old_router

# 👇 SỬA DÒNG NÀY: Import file analysis.py vừa tạo (ngang hàng main.py)
from . import analysis 

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UTH Conference Intelligent Service",
    description="AI Microservice using Google Gemini",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Router cũ
app.include_router(old_router, prefix="/intelligent", tags=["AI General Features"])

# 2. Router mới (AI Analysis)
app.include_router(analysis.router) 

@app.get("/")
def health_check():
    return {"status": "ok", "service": "intelligent-service"}