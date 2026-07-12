from app.models.base import TimestampedUUIDModel
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.module import Module, ModuleContentType
from app.models.assignment import Assignment
from app.models.submission import Submission, SyncStatus
from app.models.transaction import TransactionLog

# Ensure all models are loaded so SQLModel.metadata is fully populated
__all__ = [
    "TimestampedUUIDModel",
    "User",
    "UserRole",
    "Course",
    "Module",
    "ModuleContentType",
    "Assignment",
    "Submission",
    "SyncStatus",
    "TransactionLog"
]
