# src/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from src.config import settings

# Tạo engine kết nối
# pool_pre_ping=True giúp kiểm tra kết nối sống trước khi truy vấn (quan trọng cho MySQL)
engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=True, 
    pool_recycle=3600
)

# Tạo SessionLocal để dùng trong từng request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class cho các models kế thừa
Base = declarative_base()

# Dependency để lấy DB session (dùng trong routers)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()