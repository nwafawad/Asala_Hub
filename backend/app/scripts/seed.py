import sys
from sqlmodel import Session, select
from app.database import engine
from app.models.entities import User, Course, Module, UserRole, ContentType
from app.security import get_password_hash

def seed_db():
    print("Starting database seeding...")
    with Session(engine) as session:
        # 1. Seed Educator
        educator_email = "layla@asalahub.dev"
        educator = session.exec(select(User).where(User.email == educator_email)).first()
        if not educator:
            educator = User(
                full_name="Layla Al-Rashidi",
                email=educator_email,
                password_hash=get_password_hash("Educator@123"),
                role=UserRole.educator,
                preferred_language="ar"
            )
            session.add(educator)
            session.flush()
            print(f"Created educator: {educator.full_name} ({educator.email})")
        else:
            print(f"Educator {educator.email} already exists. Skipping.")

        # 2. Seed Student
        student_email = "omar@asalahub.dev"
        student = session.exec(select(User).where(User.email == student_email)).first()
        if not student:
            student = User(
                full_name="Omar Khalid",
                email=student_email,
                password_hash=get_password_hash("Student@123"),
                role=UserRole.student,
                preferred_language="en"
            )
            session.add(student)
            session.flush()
            print(f"Created student: {student.full_name} ({student.email})")
        else:
            print(f"Student {student.email} already exists. Skipping.")

        # 3. Seed Course
        course_title = "Introduction to Computer Science"
        course = session.exec(
            select(Course).where(Course.title == course_title, Course.educator_id == educator.id)
        ).first()
        if not course:
            course = Course(
                title=course_title,
                description="An introductory course covering the foundational aspects of Islamic history, theology, and practice.",
                educator_id=educator.id
            )
            session.add(course)
            session.flush()
            print(f"Created course: '{course.title}'")
        else:
            print(f"Course '{course.title}' already exists. Skipping.")

        # 4. Seed Modules
        modules_to_seed = [
            {
                "title": "Foundations of Aqeedah",
                "content_type": ContentType.text,
                "content": "Aqeedah refers to those matters which are believed in, with certainty and conviction, in one's heart and soul.",
                "order_index": 1
            },
            {
                "title": "The Five Pillars — Video Lecture",
                "content_type": ContentType.video,
                "content": "https://example.com/lectures/five-pillars.mp4",
                "order_index": 2
            },
            {
                "title": "Fiqh Basics: Tahara",
                "content_type": ContentType.text,
                "content": "Tahara (purification) is a key prerequisite for ritual prayers in Islamic practice.",
                "order_index": 3
            }
        ]

        # Pre-fetch all module order_indices in one query to avoid N+1 scans
        existing_order_indices = set(
            session.exec(
                select(Module.order_index).where(Module.course_id == course.id)
            ).all()
        )

        for m_data in modules_to_seed:
            if m_data["order_index"] not in existing_order_indices:
                module = Module(
                    course_id=course.id,
                    title=m_data["title"],
                    content_type=m_data["content_type"],
                    content=m_data["content"],
                    order_index=m_data["order_index"]
                )
                session.add(module)
                print(f"Created module: '{module.title}' (Order: {module.order_index})")
            else:
                print(f"Module with order {m_data['order_index']} already exists in this course. Skipping.")
        
        session.commit()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_db()
