"""
Admin User Seeder Script.

Seeds system administrator account (admin@asalahub.dev) and mock campus users
with varied roles and account statuses for development and testing.
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
    with Session(engine) as session:
        logger.info("Checking for existing Admin user...")
        admin = session.exec(select(User).where(User.email == "admin@asalahub.dev")).first()
        if not admin:
            admin = User(
                full_name="System Administrator",
                email="admin@asalahub.dev",
                password_hash=get_password_hash("admin123"),
                role=UserRole.admin,
                status=AccountStatus.active,
                preferred_language="en",
            )
            session.add(admin)
            logger.info("Created admin user: admin@asalahub.dev / admin123")

        # Mock students and educators with varied statuses
        mock_accounts = [
            ("Layla Al-Mansoor", "layla@campus.edu", UserRole.student, AccountStatus.active),
            ("Omar Khattab", "omar@campus.edu", UserRole.student, AccountStatus.suspended),
            ("Fatima Hassan", "fatima@campus.edu", UserRole.student, AccountStatus.active),
            ("Youssef Nabil", "youssef@campus.edu", UserRole.student, AccountStatus.active),
            ("Aisha Al-Zahra", "aisha@campus.edu", UserRole.student, AccountStatus.suspended),
            ("Prof. Tariq Al-Mansoor", "tariq@campus.edu", UserRole.educator, AccountStatus.active),
            ("Dr. Nadia Khalil", "nadia@campus.edu", UserRole.educator, AccountStatus.active),
            ("Prof. Kareem Ibrahim", "kareem@campus.edu", UserRole.educator, AccountStatus.suspended),
        ]

        for name, email, role, acc_status in mock_accounts:
            existing = session.exec(select(User).where(User.email == email)).first()
            if not existing:
                u = User(
                    full_name=name,
                    email=email,
                    password_hash=get_password_hash("password123"),
                    role=role,
                    status=acc_status,
                    preferred_language="en",
                )
                session.add(u)
                logger.info(f"Created {role} user: {email} ({acc_status.value})")

        session.commit()
        logger.info("Seeding completed successfully.")


if __name__ == "__main__":
    seed_admin_and_users()
