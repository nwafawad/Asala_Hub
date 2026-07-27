"""
Module CRUD operations.

Handles database queries and updates relating to Course Module entities, including creation,
retrieval by parent course, single lookups, reordering, and updating/deleting.
"""

import uuid
from typing import List, Optional
from sqlmodel import Session, select, func, col
from sqlalchemy.orm import defer, joinedload
from app.models import Module
from app.models.user import get_naive_utc_now
from app.schemas.modules import ModuleCreate, ModuleUpdate

def create_module(
    session: Session, module_in: ModuleCreate, course_id: uuid.UUID, commit: bool = True
) -> Module:
    """
    Create a new module inside a course.
    If order_index is not explicitly specified (> 0), automatically assigns the next order position.
    
    Args:
        session (Session): The active database transaction session.
        module_in (ModuleCreate): Module creation details.
        course_id (UUID): The parent Course ID.
        commit (bool): If True, commits the transaction immediately.
    Returns:
        Module: The created Module database model instance.
    """
    order_index = module_in.order_index
    if not order_index or order_index <= 0:
        max_order = session.exec(
            select(func.max(col(Module.order_index))).where(col(Module.course_id) == course_id)
        ).first()
        order_index = (max_order or 0) + 1

    module = Module(
        course_id=course_id,
        title=module_in.title,
        content_type=module_in.content_type,
        content=module_in.content,
        order_index=order_index
    )
    session.add(module)
    if commit:
        session.commit()
        session.refresh(module)
    return module

def get_modules_for_course(
    session: Session,
    course_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    include_content: bool = True
) -> List[Module]:
    """
    Retrieve modules for a specific course ordered by order_index.
    
    Args:
        session (Session): The active database transaction session.
        course_id (UUID): The parent Course ID.
        skip (int): Pagination offset count.
        limit (int): Pagination maximum count limit.
        include_content (bool): If False, defers loading heavy content payload.
    Returns:
        List[Module]: List of ordered Module model instances.
    """
    query = select(Module).where(col(Module.course_id) == course_id).order_by(col(Module.order_index))
    if not include_content:
        query = query.options(defer(getattr(Module, "content")))
    return list(session.exec(query.offset(skip).limit(limit)).all())

def count_modules_for_course(session: Session, course_id: uuid.UUID) -> int:
    """
    Count total modules for a specific course efficiently.
    """
    return session.exec(
        select(func.count(col(Module.id))).where(col(Module.course_id) == course_id)
    ).first() or 0

def get_module_by_id_and_course(
    session: Session, module_id: uuid.UUID, course_id: uuid.UUID, load_course: bool = False
) -> Optional[Module]:
    """
    Retrieve a single module by its ID and course ID.
    
    Args:
        session (Session): The active database transaction session.
        module_id (UUID): The Module UUID to fetch.
        course_id (UUID): The parent Course UUID.
        load_course (bool): If True, eagerly loads the parent Course relationship to eliminate N+1 queries.
    Returns:
        Optional[Module]: The Module instance, or None if not found.
    """
    query = select(Module).where(col(Module.id) == module_id, col(Module.course_id) == course_id)
    if load_course:
        query = query.options(joinedload(getattr(Module, "course")))
    return session.exec(query).first()

def update_module(
    session: Session, db_module: Module, module_in: ModuleUpdate, commit: bool = True
) -> Module:
    """
    Update module attributes.
    
    Args:
        session (Session): The active database transaction session.
        db_module (Module): The existing Module model instance.
        module_in (ModuleUpdate): The updated fields schema.
        commit (bool): If True, commits the transaction immediately.
    Returns:
        Module: The updated Module database model instance.
    """
    update_data = module_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_module, key, value)
    db_module.updated_at = get_naive_utc_now()
    session.add(db_module)
    if commit:
        session.commit()
        session.refresh(db_module)
    return db_module

def reorder_course_modules(
    session: Session, course_id: uuid.UUID, ordered_module_ids: List[uuid.UUID], commit: bool = True
) -> None:
    """
    Bulk update order_index positions for a list of module IDs in a single atomic transaction.
    """
    now = get_naive_utc_now()
    for index, module_id in enumerate(ordered_module_ids, start=1):
        db_module = session.get(Module, module_id)
        if db_module and db_module.course_id == course_id:
            db_module.order_index = index
            db_module.updated_at = now
            session.add(db_module)
    if commit:
        session.commit()

def delete_module(session: Session, db_module: Module, commit: bool = True) -> None:
    """
    Delete a module from the database.
    
    Args:
        session (Session): The active database transaction session.
        db_module (Module): The Module model instance to delete.
        commit (bool): If True, commits the transaction immediately.
    """
    session.delete(db_module)
    if commit:
        session.commit()

def get_course_syllabus(session: Session, course_id: uuid.UUID) -> List[Module]:
    """
    Retrieve modules for a course syllabus, deferring loading of the heavy content field.
    
    Args:
        session (Session): The active database transaction session.
        course_id (UUID): The Course UUID to fetch syllabus for.
    Returns:
        List[Module]: List of modules with empty/deferred content.
    """
    return get_modules_for_course(session, course_id, include_content=False)

