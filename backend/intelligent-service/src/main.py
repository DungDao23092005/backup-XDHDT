from fastapi import FastAPI
from .database import engine, Base
from .router import router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UTH Conference Intelligent Service",
    description="AI Microservice using Google Gemini",
    version="1.0.0"
)

app.include_router(router, prefix="/intelligent", tags=["AI Features"])

@app.get("/")
def health_check():
    return {"status": "ok", "service": "intelligent-service"}