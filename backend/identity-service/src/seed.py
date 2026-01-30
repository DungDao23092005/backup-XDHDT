from src.database import SessionLocal
from src.models import User, Role
from src.auth import get_password_hash

def seed():
    db = SessionLocal()
    try:
        print("--- Starting Seed Data ---")
        
        # 1. DANH SÁCH ROLE CẦN CÓ (Viết đúng theo Database: Chữ đầu hoa)
        # Nếu DB bạn đang lưu là "ADMIN" (hoa hết) thì sửa lại list này thành hoa hết.
        role_names = ["ADMIN", "AUTHOR", "CHAIR", "REVIEWER"]
        roles_db = {}

        # Vòng lặp kiểm tra và tạo Role
        for r_name in role_names:
            role = db.query(Role).filter(Role.role_name == r_name).first()
            if not role:
                role = Role(role_name=r_name)
                db.add(role)
                print(f"-> Created new role: {r_name}")
            else:
                print(f"-> Role existing: {r_name}")
            # Lưu tạm vào biến để lát gán cho User
            roles_db[r_name] = role
        
        db.commit() # Commit lần 1 để Role có ID chính thức

        # 2. TẠO CÁC USER MẪU (Đủ 4 quyền)
        users_to_create = [
            {
                "email": "admin@uth.edu.vn",
                "name": "System Administrator",
                "role_obj": roles_db["ADMIN"]
            },
            {
                "email": "author@uth.edu.vn",
                "name": "Tac Gia",
                "role_obj": roles_db["AUTHOR"]
            },
            {
                "email": "chair@uth.edu.vn",
                "name": "Truong Ban",
                "role_obj": roles_db["CHAIR"]
            },
            {
                "email": "reviewer@uth.edu.vn",
                "name": "Phan Bien",
                "role_obj": roles_db["REVIEWER"]
            }
        ]

        for u_data in users_to_create:
            user = db.query(User).filter(User.email == u_data["email"]).first()
            if not user:
                new_user = User(
                    email=u_data["email"],
                    password_hash=get_password_hash("123456"), # Mật khẩu chung là 123456 cho dễ nhớ
                    full_name=u_data["name"],
                    is_active=True
                )
                # Gán quyền
                new_user.roles.append(u_data["role_obj"])
                db.add(new_user)
                print(f"-> Created user: {u_data['email']}")
            else:
                print(f"-> User existing: {u_data['email']}")

        db.commit()
        print("--- Seed data inserted successfully ---")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()