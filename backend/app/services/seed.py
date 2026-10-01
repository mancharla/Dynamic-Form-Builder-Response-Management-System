from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.role import Role


def seed_roles():
    db = SessionLocal()

    try:
        default_roles = ["Admin", "User"]

        for role_name in default_roles:
            existing_role = db.scalar(
                select(Role).where(Role.name == role_name)
            )

            if not existing_role:
                db.add(Role(name=role_name))

        db.commit()
        print("Default roles seeded successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()