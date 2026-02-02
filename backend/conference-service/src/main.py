from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import Base, engine
from pathlib import Path
from fastapi.staticfiles import StaticFiles
# routers
from src.conference.router import router as conference_router
from src.conference.tracks.router import router as track_router
from src.conference.topics.router import router as topic_router
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent  # .../src
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="UTH Conference Conference Service")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

origins = [
    "http://localhost:3000",      # React chạy local
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# tạo bảng khi khởi động
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Conference service running"}

app.include_router(conference_router)
app.include_router(track_router)
app.include_router(topic_router)
