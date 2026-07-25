"""add_schema_version_to_transaction_log

Revision ID: c1f92e34567a
Revises: b2b899c8275e
Create Date: 2026-07-25 17:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1f92e34567a'
down_revision: Union[str, None] = 'b2b899c8275e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactionlog',
        sa.Column('schema_version', sa.Integer(), server_default='1', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('transactionlog', 'schema_version')
