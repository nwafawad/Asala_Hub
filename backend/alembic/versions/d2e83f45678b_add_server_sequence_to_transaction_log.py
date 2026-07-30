"""add_server_sequence_to_transaction_log

Revision ID: d2e83f45678b
Revises: c1f92e34567a
Create Date: 2026-07-25 17:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2e83f45678b'
down_revision: Union[str, None] = 'c1f92e34567a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.schema.CreateSequence(sa.Sequence("tx_log_server_seq")))
    op.add_column(
        'transactionlog',
        sa.Column('server_sequence', sa.BigInteger(), server_default=sa.text("nextval('tx_log_server_seq')"), nullable=False)
    )
    op.add_column(
        'transactionlog',
        sa.Column('server_received_at', sa.DateTime(), server_default=sa.func.now(), nullable=False)
    )
    op.create_index(op.f('ix_transactionlog_server_received_at'), 'transactionlog', ['server_received_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_transactionlog_server_received_at'), table_name='transactionlog')
    op.drop_column('transactionlog', 'server_received_at')
    op.drop_column('transactionlog', 'server_sequence')
    op.execute(sa.schema.DropSequence(sa.Sequence("tx_log_server_seq")))
