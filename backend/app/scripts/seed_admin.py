"""
Admin User Seeder Script.

Seeds a system administrator account using environment variables (ADMIN_EMAIL, ADMIN_PASSWORD)
or clean defaults.
"""

import sys
import os
import logging
from sqlmodel import Session, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import engine
from app.models.user import User, UserRole, AccountStatus
from app.core.security import get_password_hash

logger = logging.getLogger("asala_hub.seed_admin")
logging.basicConfig(level=logging.INFO)


def seed_admin_and_users():
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)

    admin_email = os.getenv("ADMIN_EMAIL", "admin@asalahub.org").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "AdminPassword123!").strip()

    with Session(engine) as session:
        logger.info(f"Checking for existing Admin user ({admin_email})...")
        admin = session.exec(select(User).where(User.email == admin_email)).first()
        if not admin:
            admin = User(
                full_name="System Administrator",
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                role=UserRole.admin,
                status=AccountStatus.active,
                preferred_language="en",
            )
            session.add(admin)
            session.commit()
            logger.info(f"Created system admin user: {admin_email}")
        else:
            logger.info(f"Admin user {admin_email} already exists.")


if __name__ == "__main__":
    seed_admin_and_users()
