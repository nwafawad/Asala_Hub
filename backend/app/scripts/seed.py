"""
Database Seeding Script for Asala Hub.

Populates multi-subject course catalog, modules, assignments, student submissions,
offline conflict states, and transaction log history across multiple educator and student user roles.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from sqlmodel import Session, select
from app.core.database import engine
from app.models import (
    User,
    Course,
    Module,
    Assignment,
    Submission,
    TransactionLog,
    UserRole,
    ContentType,
    SyncStatus,
)
from app.core.security import get_password_hash
from app.models.base import get_naive_utc_now


def seed_db():
    print("Starting database seeding...")
    now = get_naive_utc_now()
    default_password = get_password_hash("Password123!")

    with Session(engine) as session:
        # 1. Seed Educators
        educators_data: list[dict[str, Any]] = [
            {
                "full_name": "Layla Al-Rashidi",
                "email": "layla@asalahub.dev",
                "role": UserRole.educator,
                "preferred_language": "ar"
            },
            {
                "full_name": "Dr. Tariq Mansour",
                "email": "tariq@asalahub.dev",
                "role": UserRole.educator,
                "preferred_language": "en"
            }
        ]

        educators: dict[str, User] = {}
        for ed_data in educators_data:
            user = session.exec(select(User).where(User.email == ed_data["email"])).first()
            if not user:
                user = User(
                    full_name=ed_data["full_name"],
                    email=ed_data["email"],
                    password_hash=default_password,
                    role=ed_data["role"],
                    preferred_language=ed_data["preferred_language"]
                )
                session.add(user)
                session.flush()
                print(f"Created educator: {user.full_name} ({user.email})")
            else:
                print(f"Educator {user.email} already exists.")
            educators[ed_data["email"]] = user

        # 2. Seed Students
        students_data: list[dict[str, Any]] = [
            {"full_name": "Omar Khalid", "email": "omar@asalahub.dev", "role": UserRole.student, "preferred_language": "en"},
            {"full_name": "Fatima Al-Zahra", "email": "fatima@asalahub.dev", "role": UserRole.student, "preferred_language": "ar"},
            {"full_name": "Youssef Hassan", "email": "youssef@asalahub.dev", "role": UserRole.student, "preferred_language": "en"},
            {"full_name": "Zainab Al-Farsi", "email": "zainab@asalahub.dev", "role": UserRole.student, "preferred_language": "ar"},
            {"full_name": "Ahmed Nour", "email": "ahmed@asalahub.dev", "role": UserRole.student, "preferred_language": "en"},
        ]

        students: dict[str, User] = {}
        for st_data in students_data:
            user = session.exec(select(User).where(User.email == st_data["email"])).first()
            if not user:
                user = User(
                    full_name=st_data["full_name"],
                    email=st_data["email"],
                    password_hash=default_password,
                    role=st_data["role"],
                    preferred_language=st_data["preferred_language"]
                )
                session.add(user)
                session.flush()
                print(f"Created student: {user.full_name} ({user.email})")
            else:
                print(f"Student {user.email} already exists.")
            students[st_data["email"]] = user

        # 3. Seed Courses & Modules & Assignments
        courses_data: list[dict[str, Any]] = [
            {
                "title": "Introduction to Computer Science",
                "description": "Foundational course covering algorithm design, data structures, and Python programming fundamentals.",
                "educator_email": "layla@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Computational Thinking & Python Basics",
                        "content_type": ContentType.text,
                        "content": "Python is a high-level interpreted programming language emphasizing readability and clear syntax. Key concepts include variables, data types, and operators.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: Control Flow & Loop Structures",
                        "content_type": ContentType.video,
                        "content": "https://example.com/lectures/python-control-flow.mp4",
                        "order_index": 2
                    },
                    {
                        "title": "Module 3: Functions & Modular Software Design",
                        "content_type": ContentType.text,
                        "content": "Functions encapsulate reusable logic, taking input arguments and producing return values to promote DRY design principles.",
                        "order_index": 3
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: Python Syntax & Operators",
                        "description": "Write a Python script that calculates compound interest and formats the output cleanly.",
                        "due_date": now + timedelta(days=7),
                        "submissions": [
                            {"student_email": "omar@asalahub.dev", "content": "def calculate_interest(p, r, t):\n    return p * (1 + r)**t\n\nprint(calculate_interest(1000, 0.05, 3))", "grade": 95.0, "sync_status": SyncStatus.synced},
                            {"student_email": "fatima@asalahub.dev", "content": "principal = 1000\nrate = 0.05\ntime = 3\namount = principal * (1 + rate)**time\nprint('Total:', amount)", "grade": None, "sync_status": SyncStatus.synced},
                            {"student_email": "zainab@asalahub.dev", "content": "p = 1000\nr = 0.05\nt = 3\nprint(p * (1+r)**t)", "grade": 90.0, "sync_status": SyncStatus.synced},
                        ]
                    },
                    {
                        "title": "Assignment 2: Control Flow & Function Design",
                        "description": "Implement a prime number validator and array sorter using modular functions.",
                        "due_date": now + timedelta(days=14),
                        "submissions": [
                            {"student_email": "ahmed@asalahub.dev", "content": "def is_prime(n):\n    if n < 2: return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0: return False\n    return True", "grade": 92.0, "sync_status": SyncStatus.synced}
                        ]
                    }
                ]
            },
            {
                "title": "Database Systems & SQL Modeling",
                "description": "In-depth study of relational database design, SQL query optimization, indexing strategies, and transaction isolation.",
                "educator_email": "layla@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Relational Data Modeling & ER Diagrams",
                        "content_type": ContentType.text,
                        "content": "Entity-Relationship modeling defines entities, attributes, and relationships. Normalization (1NF to 3NF) eliminates data redundancy.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: Advanced SQL Queries & Aggregates",
                        "content_type": ContentType.video,
                        "content": "https://example.com/lectures/sql-aggregates-joins.mp4",
                        "order_index": 2
                    },
                    {
                        "title": "Module 3: Indexing, B-Trees & Transaction Concurrency",
                        "content_type": ContentType.text,
                        "content": "B-Tree indexes speed up SELECT queries while adding write overhead. ACID properties guarantee database transactional integrity.",
                        "order_index": 3
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: SQL Schema & Query Optimization",
                        "description": "Design an e-commerce SQL schema and write optimized query joins with indexing.",
                        "due_date": now + timedelta(days=8),
                        "submissions": [
                            {"student_email": "omar@asalahub.dev", "content": "CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR UNIQUE);\nCREATE INDEX idx_users_email ON users(email);", "grade": 98.0, "sync_status": SyncStatus.synced},
                            {"student_email": "youssef@asalahub.dev", "content": "SELECT u.full_name, COUNT(o.id) FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id;", "grade": None, "sync_status": SyncStatus.synced}
                        ]
                    }
                ]
            },
            {
                "title": "Cybersecurity & Network Protocols",
                "description": "Explores cryptographic algorithms, TLS/SSL handshake, network packet analysis, and OWASP web vulnerability defenses.",
                "educator_email": "layla@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Cryptographic Primitives & Hashing Functions",
                        "content_type": ContentType.text,
                        "content": "Cryptographic hash functions (e.g. SHA-256, bcrypt) generate deterministic fixed-size outputs with preimage and collision resistance.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: TLS 1.3 Handshake & Transport Security",
                        "content_type": ContentType.video,
                        "content": "https://example.com/lectures/tls13-handshake.mp4",
                        "order_index": 2
                    },
                    {
                        "title": "Module 3: OWASP Top 10 Mitigations",
                        "content_type": ContentType.text,
                        "content": "Prevent SQL injection, XSS, and CSRF using parameterized queries, Content Security Policy (CSP), and HttpOnly SameSite cookies.",
                        "order_index": 3
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: Web Security Audit & Penetration Testing Report",
                        "description": "Audit a sample web app for OWASP vulnerabilities and propose remediation patches.",
                        "due_date": now + timedelta(days=5),
                        "submissions": [
                            {"student_email": "omar@asalahub.dev", "content": "1. Sanitized raw SQL with parameterized statements.\n2. Injected Content-Security-Policy headers.", "grade": 94.0, "sync_status": SyncStatus.synced},
                            {"student_email": "zainab@asalahub.dev", "content": "Report on XSS vulnerability mitigation using HTML entity encoding.", "grade": None, "sync_status": SyncStatus.synced}
                        ]
                    }
                ]
            },
            {
                "title": "Web Development & PWA Architecture",
                "description": "Modern frontend and offline-first PWA development using Next.js App Router, Service Workers, IndexedDB, and Dexie.js.",
                "educator_email": "layla@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Next.js App Router & Server Components",
                        "content_type": ContentType.text,
                        "content": "Next.js App Router uses React Server Components by default to optimize initial load times and reduce client JS bundle size.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: Service Workers & Workbox Offline Caching",
                        "content_type": ContentType.video,
                        "content": "https://example.com/lectures/workbox-offline-pwa.mp4",
                        "order_index": 2
                    },
                    {
                        "title": "Module 3: Client DB Sync with Dexie.js",
                        "content_type": ContentType.text,
                        "content": "Dexie.js wraps IndexedDB with a clean promise-based API, enabling local transaction queuing for offline sync engines.",
                        "order_index": 3
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: PWA Service Worker Implementation",
                        "description": "Build a Workbox service worker caching shell and wire Dexie.js offline submission store.",
                        "due_date": now + timedelta(days=10),
                        "submissions": [
                            {"student_email": "fatima@asalahub.dev", "content": "import Dexie from 'dexie';\nexport const db = new Dexie('OfflineStore');\ndb.version(1).stores({ submissions: 'id, assignment_id, sync_status' });", "grade": 96.0, "sync_status": SyncStatus.synced},
                            {"student_email": "ahmed@asalahub.dev", "content": "Draft offline submission edited locally while disconnected.", "grade": None, "sync_status": SyncStatus.conflict}
                        ]
                    }
                ]
            },
            {
                "title": "Applied Mathematics for Computing",
                "description": "Essential mathematical foundations for computer science including propositional logic, discrete math, and boolean algebra.",
                "educator_email": "layla@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Propositional Logic & Truth Tables",
                        "content_type": ContentType.text,
                        "content": "Propositional logic builds logical compound statements using AND (∧), OR (∨), and NOT (¬) operators.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: Set Theory & Relations",
                        "content_type": ContentType.text,
                        "content": "Sets represent collections of distinct objects. Core operations include union, intersection, and Cartesian products.",
                        "order_index": 2
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: Boolean Algebra & Logic Simplification",
                        "description": "Simplify given boolean expressions using De Morgan's laws and truth tables.",
                        "due_date": now + timedelta(days=10),
                        "submissions": [
                            {"student_email": "zainab@asalahub.dev", "content": "A ∧ (B ∨ C) = (A ∧ B) ∨ (A ∧ C) using distributive law.", "grade": 100.0, "sync_status": SyncStatus.synced}
                        ]
                    }
                ]
            },
            {
                "title": "Foundations of Islamic Studies",
                "description": "An introductory course exploring Islamic history, theology (Aqeedah), and core ritual practices (Fiqh).",
                "educator_email": "tariq@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Foundations of Aqeedah",
                        "content_type": ContentType.text,
                        "content": "Aqeedah refers to those matters which are believed in with certainty and conviction in one's heart and soul.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: The Five Pillars — Video Lecture",
                        "content_type": ContentType.video,
                        "content": "https://example.com/lectures/five-pillars.mp4",
                        "order_index": 2
                    },
                    {
                        "title": "Module 3: Fiqh Basics: Tahara & Prayer",
                        "content_type": ContentType.text,
                        "content": "Tahara (purification) is a fundamental prerequisite for ritual worship and daily prayers.",
                        "order_index": 3
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: Reflection Essay on Ethical Frameworks",
                        "description": "Write a 500-word essay reflecting on ethical frameworks in classical Islamic scholarship.",
                        "due_date": now + timedelta(days=12),
                        "submissions": [
                            {"student_email": "youssef@asalahub.dev", "content": "Classical scholarship emphasizes compassion, honesty, and social responsibility as the bedrock of community ethics.", "grade": 88.0, "sync_status": SyncStatus.synced},
                            {"student_email": "ahmed@asalahub.dev", "content": "Ethical frameworks guide both individual actions and societal justice principles.", "grade": None, "sync_status": SyncStatus.synced}
                        ]
                    }
                ]
            },
            {
                "title": "Arabic Grammar & Classical Literature",
                "description": "Comprehensive study of Arabic syntax (Nahw), morphology (Sarf), and classical literature analysis.",
                "educator_email": "tariq@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Fundamentals of Nahw (Syntax)",
                        "content_type": ContentType.text,
                        "content": "Arabic sentences are categorized into Nominal (Jumla Ismiyya) and Verbal (Jumla Fi'liyya) sentence structures.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: Sarf Morphology & Verb Scales",
                        "content_type": ContentType.video,
                        "content": "https://example.com/lectures/arabic-sarf-scales.mp4",
                        "order_index": 2
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: Grammatical Analysis of Classical Texts",
                        "description": "Perform full sentence parsing (I'rab) on selected classical prose excerpts.",
                        "due_date": now + timedelta(days=15),
                        "submissions": [
                            {"student_email": "fatima@asalahub.dev", "content": "الإعراب: الجملة الاسمية تتكون من المبتدأ والخبر المرفوعين.", "grade": 97.0, "sync_status": SyncStatus.synced}
                        ]
                    }
                ]
            },
            {
                "title": "Hadith Sciences & Usul Al-Fiqh",
                "description": "Introduction to Hadith classification, Isnad (chain of narration) methodology, and principles of Islamic jurisprudence (Usul Al-Fiqh).",
                "educator_email": "tariq@asalahub.dev",
                "modules": [
                    {
                        "title": "Module 1: Classification of Hadith & Isnad Analysis",
                        "content_type": ContentType.text,
                        "content": "Hadith are categorized by authenticity into Sahih (sound), Hasan (good), and Da'if (weak) based on narrators' integrity and continuous chain.",
                        "order_index": 1
                    },
                    {
                        "title": "Module 2: Usul Al-Fiqh: Legal Deductive Methodology",
                        "content_type": ContentType.video,
                        "content": "https://example.com/lectures/usul-al-fiqh-principles.mp4",
                        "order_index": 2
                    }
                ],
                "assignments": [
                    {
                        "title": "Assignment 1: Isnad Evaluation & Juristic Deduction Analysis",
                        "description": "Evaluate a sample chain of narration and outline the juristic derivation steps.",
                        "due_date": now + timedelta(days=9),
                        "submissions": [
                            {"student_email": "youssef@asalahub.dev", "content": "Isnad evaluation verifies continuity (Ittisal) and narrator reliability (Adalah and Dabt).", "grade": 91.0, "sync_status": SyncStatus.synced},
                            {"student_email": "ahmed@asalahub.dev", "content": "Juristic deduction derives legal rulings from primary text sources.", "grade": 85.0, "sync_status": SyncStatus.synced}
                        ]
                    }
                ]
            }
        ]

        for c_data in courses_data:
            educator = educators[c_data["educator_email"]]
            course = session.exec(
                select(Course).where(Course.title == c_data["title"], Course.educator_id == educator.id)
            ).first()

            if not course:
                course = Course(
                    title=c_data["title"],
                    description=c_data["description"],
                    educator_id=educator.id
                )
                session.add(course)
                session.flush()
                print(f"Created course: '{course.title}'")
            else:
                print(f"Course '{course.title}' already exists.")

            # Seed Modules for Course
            existing_module_orders = set(
                session.exec(select(Module.order_index).where(Module.course_id == course.id)).all()
            )
            modules: list[dict[str, Any]] = c_data["modules"]
            for m_data in modules:
                if m_data["order_index"] not in existing_module_orders:
                    module = Module(
                        course_id=course.id,
                        title=m_data["title"],
                        content_type=m_data["content_type"],
                        content=m_data["content"],
                        order_index=m_data["order_index"]
                    )
                    session.add(module)
                    print(f"  └─ Added module: '{module.title}'")

            # Seed Assignments & Submissions
            assignments: list[dict[str, Any]] = c_data["assignments"]
            for a_data in assignments:
                assignment = session.exec(
                    select(Assignment).where(
                        Assignment.course_id == course.id,
                        Assignment.title == a_data["title"]
                    )
                ).first()

                if not assignment:
                    assignment = Assignment(
                        course_id=course.id,
                        title=a_data["title"],
                        description=a_data["description"],
                        due_date=a_data["due_date"]
                    )
                    session.add(assignment)
                    session.flush()
                    print(f"  └─ Added assignment: '{assignment.title}'")

                # Seed Submissions if specified
                submissions: list[dict[str, Any]] = a_data.get("submissions", [])
                for sub_info in submissions:
                    student_user = students[sub_info["student_email"]]
                    existing_sub = session.exec(
                        select(Submission).where(
                            Submission.assignment_id == assignment.id,
                            Submission.student_id == student_user.id
                        )
                    ).first()

                    if not existing_sub:
                        submission = Submission(
                            assignment_id=assignment.id,
                            student_id=student_user.id,
                            content=sub_info["content"],
                            submitted_at=now - timedelta(hours=12),
                            sync_status=sub_info.get("sync_status", SyncStatus.synced),
                            grade=sub_info["grade"],
                            version=1
                        )
                        session.add(submission)
                        session.flush()
                        print(f"      └─ Added submission for student '{student_user.full_name}' (Status: {submission.sync_status.value}, Grade: {sub_info['grade']})")

                        # Record transaction log for audit trail
                        tx_log = TransactionLog(
                            id=uuid.uuid4(),
                            user_id=student_user.id,
                            entity_type="submission",
                            entity_id=submission.id,
                            payload={"assignment_id": str(assignment.id), "content": sub_info["content"], "version": 1},
                            schema_version=1,
                            server_received_at=now,
                            client_timestamp=now - timedelta(hours=12),
                            synced_at=now
                        )
                        session.add(tx_log)

        session.commit()
    print("Database seeding completed successfully.")


if __name__ == "__main__":
    seed_db()
