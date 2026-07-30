from enum import Enum
import uuid
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
import sqlalchemy as sa

from app.models.base import TimestampModel

if TYPE_CHECKING:
    from app.models.user import User


class AdminActionType(str, Enum):
    """
    Types of administrative actions logged in the audit trail.
    """
    password_reset = "password_reset"
    account_suspended = "account_suspended"
    account_reactivated = "account_reactivated"
    force_logout = "force_logout"
    account_created = "account_created"
    bulk_accounts_created = "bulk_accounts_created"


class AdminAuditEvent(TimestampModel, table=True):
    """
    Compliance-grade audit record for administrative actions.
    Logs actor, action type, target user, timestamp, and metadata.
    """
    actor_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    action_type: AdminActionType = Field(
        sa_column=Column(
            sa.Enum(AdminActionType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
        )
    )
    target_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)
    metadata_json: Optional[str] = Field(default=None)

    # Relationships
    actor: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "AdminAuditEvent.actor_id"}
    )
    target_user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "AdminAuditEvent.target_user_id"}
    )
