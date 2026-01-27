from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import Base, engine
from src.routers import assignments, reviews, coi, discussions, papers,bids,extensions

app = FastAPI(title="UTH Conference Review Service")

origins = [
    "http://localhost:3000",     
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "review-service is running"}

app.include_router(assignments.router)
app.include_router(reviews.router)
app.include_router(coi.router)
app.include_router(discussions.router)
app.include_router(papers.router)
app.include_router(bids.router)
app.include_router(extensions.router)