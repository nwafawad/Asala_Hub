import uuid
from typing import List, Optional
from sqlmodel import Session, select
from app.models import Module
from app.schemas.modules import ModuleCreate, ModuleUpdate

def create_module(session: Session, module_in: ModuleCreate, course_id: uuid.UUID) -> Module:
    """Create a new module inside a course."""
    module = Module(
        course_id=course_id,
        title=module_in.title,
        content_type=module_in.content_type,
        content=module_in.content,
        order_index=module_in.order_index
    )
    session.add(module)
    session.commit()
    session.refresh(module)
    return module

def get_modules_for_course(
    session: Session, course_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[Module]:
    """Retrieve modules for a specific course ordered by order_index."""
    return session.exec(
        select(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.order_index)
        .offset(skip)
        .limit(limit)
    ).all()

def get_module_by_id_and_course(
    session: Session, module_id: uuid.UUID, course_id: uuid.UUID
) -> Optional[Module]:
    """Retrieve a single module by its ID and course ID."""
    return session.exec(
        select(Module)
        .where(Module.id == module_id, Module.course_id == course_id)
    ).first()

def update_module(session: Session, db_module: Module, module_in: ModuleUpdate) -> Module:
    """Update module attributes."""
    update_data = module_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_module, key, value)
    session.add(db_module)
    session.commit()
    session.refresh(db_module)
    return db_module

def delete_module(session: Session, db_module: Module) -> None:
    """Delete a module from the database."""
    session.delete(db_module)
    session.commit()
