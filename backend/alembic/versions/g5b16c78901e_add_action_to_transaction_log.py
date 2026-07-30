"""add_action_to_transaction_log

Revision ID: g5b16c78901e
Revises: f4a05b67890d
Create Date: 2026-07-30 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g5b16c78901e'
down_revision: Union[str, None] = 'f4a05b67890d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactionlog',
        sa.Column('action', sa.String(), server_default='UPDATE', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('transactionlog', 'action')
