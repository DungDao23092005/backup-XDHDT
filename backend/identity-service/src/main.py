import os
from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials

from src.database import engine, SessionLocal
from src import models
from src.routers import auth, users
from src.auth import get_password_hash

# --- KHỞI TẠO FIREBASE ADMIN SDK ---
# Lấy đường dẫn tuyệt đối đến file serviceAccountKey.json nằm cùng thư mục với main.py
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    service_account_path = os.path.join(current_dir, "serviceAccountKey.json")
    
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    print(f"--- Firebase Admin Initialized using: {service_account_path} ---")
except Exception as e:
    print(f"!!! WARNING: Could not initialize Firebase: {e}")
# -----------------------------------

app = FastAPI(title="UTH Conference Identity Service")
app.include_router(auth.router)
app.include_router(users.router)

models.Base.metadata.create_all(bind=engine)

def init_roles_and_admin():
    db = SessionLocal()
    try:
        print("--- Starting seed roles & admin ---")

        needed_roles = ["ADMIN", "AUTHOR", "CHAIR", "REVIEWER"]

        existing_roles = db.query(models.Role).all()
        existing_names = {r.role_name for r in existing_roles}

        for r in needed_roles:
            if r not in existing_names:
                db.add(models.Role(role_name=r))
                print(f"-> Created role: {r}")

        db.commit()

        admin_email = os.getenv("ADMIN_EMAIL", "admin@uth.edu.vn")
        admin_password = os.getenv("ADMIN_PASSWORD", "123456")
        admin_name = os.getenv("ADMIN_NAME", "System Administrator")

        admin_user = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin_user:
            admin_role = (
                db.query(models.Role)
                .filter(models.Role.role_name == "ADMIN")
                .first()
            )

            new_admin = models.User(
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                full_name=admin_name,
                is_active=True
            )

            if hasattr(new_admin, "roles") and admin_role is not None:
                new_admin.roles.append(admin_role)

            db.add(new_admin)
            db.commit()
            print(f"--- Seed admin OK: {admin_email} / {admin_password} ---")
        else:
            admin_role = (
                db.query(models.Role)
                .filter(models.Role.role_name == "ADMIN")
                .first()
            )
            if admin_role and hasattr(admin_user, "roles"):
                current = {r.role_name for r in admin_user.roles}
                if "ADMIN" not in current:
                    admin_user.roles.append(admin_role)
                    db.commit()
                    print(f"--- Added ADMIN role to existing admin: {admin_email} ---")
                else:
                    print(f"--- Admin already exists: {admin_email} (role OK) ---")
            else:
                print(f"--- Admin already exists: {admin_email} ---")

        print("--- Seed done ---")

    except Exception as e:
        db.rollback()
        print(f"Lỗi khởi tạo DB: {e}")
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    if os.getenv("SEED_ON_STARTUP", "true").lower() == "true":
        init_roles_and_admin()


@app.get("/")
def root():
    return {"message": "identity-service is running"}