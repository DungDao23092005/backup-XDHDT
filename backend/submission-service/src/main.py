
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from .routers import submissions
from .config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="UTH Conference Submission Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(submissions.router)

@app.get("/")
def root():
    return {"message": "Service is running!"}
