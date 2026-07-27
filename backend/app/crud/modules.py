"""
Module CRUD operations.

Handles database queries and updates relating to Course Module entities, including creation,
retrieval by parent course, single lookups, and updating/deleting.
"""

import uuid
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.orm import defer, joinedload
from app.models import Module
from app.models.user import get_naive_utc_now
from app.schemas.modules import ModuleCreate, ModuleUpdate

def create_module(
    session: Session, module_in: ModuleCreate, course_id: uuid.UUID, commit: bool = True
) -> Module:
    """
    Create a new module inside a course.
    
    Args:
        session (Session): The active database transaction session.
        module_in (ModuleCreate): Module creation details.
        course_id (UUID): The parent Course ID.
        commit (bool): If True, commits the transaction immediately.
    Returns:
        Module: The created Module database model instance.
    """
    module = Module(
        course_id=course_id,
        title=module_in.title,
        content_type=module_in.content_type,
        content=module_in.content,
        order_index=module_in.order_index
    )
    session.add(module)
    if commit:
        session.commit()
        session.refresh(module)
    return module

def get_modules_for_course(
    session: Session, course_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[Module]:
    """
    Retrieve modules for a specific course ordered by order_index.
    
    Args:
        session (Session): The active database transaction session.
        course_id (UUID): The parent Course ID.
        skip (int): Pagination offset count.
        limit (int): Pagination maximum count limit.
    Returns:
        List[Module]: List of ordered Module model instances.
    """
    return session.exec(
        select(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.order_index)
        .offset(skip)
        .limit(limit)
    ).all()

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
    query = select(Module).where(Module.id == module_id, Module.course_id == course_id)
    if load_course:
        query = query.options(joinedload(Module.course))
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

def delete_module(session: Session, db_module: Module) -> None:
    """
    Delete a module from the database.
    
    Args:
        session (Session): The active database transaction session.
        db_module (Module): The Module model instance to delete.
    """
    session.delete(db_module)
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
    return session.exec(
        select(Module)
        .where(Module.course_id == course_id)
        .options(defer(Module.content))
        .order_by(Module.order_index)
    ).all()

