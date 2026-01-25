from fastapi import FastAPI
from .database import engine, Base
from .routers import notifications

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UTH Conference Notification Service",
    description="Microservice chuyên xử lý thông báo và email",
    version="1.0.0"
)

app.include_router(notifications.router)

@app.get("/")
def root():
    return {"message": "Notification Service is running..."}