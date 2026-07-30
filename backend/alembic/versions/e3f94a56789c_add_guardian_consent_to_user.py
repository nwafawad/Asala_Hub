"""add_guardian_consent_to_user

Revision ID: e3f94a56789c
Revises: d2e83f45678b
Create Date: 2026-07-28 17:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f94a56789c'
down_revision: Union[str, None] = '467567e12720'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'user',
        sa.Column('requires_guardian_consent', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )
    op.add_column(
        'user',
        sa.Column('guardian_email', sa.String(length=255), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('user', 'guardian_email')
    op.drop_column('user', 'requires_guardian_consent')
