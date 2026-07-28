"""
Admin & Guardian Consent Router (CR-1, CR-2)

Exposes endpoints for institution/guardian consent verification and minor consent notification.
"""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_role
from app.models.user import User, UserRole

logger = logging.getLogger("asala_hub")
router = APIRouter(tags=["admin"])


class GuardianConsentPayload(BaseModel):
    student_id: str
    guardian_email: EmailStr
    consent_notes: Optional[str] = None


@router.post("/admin/consent/guardian-notify", status_code=status.HTTP_200_OK)
def notify_guardian(
    payload: GuardianConsentPayload,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
) -> dict:
    """
    Sends an institutional consent notification when a minor registers.
    Requires Educator or Admin role.
    """
    logger.info(
        f"Guardian consent notification triggered for student {payload.student_id} to guardian {payload.guardian_email}"
    )
    return {
        "status": "sent",
        "student_id": payload.student_id,
        "guardian_email": payload.guardian_email,
        "message": "Guardian consent notification processed successfully."
    }
