"""add_admin_fields_and_audit_table

Revision ID: f4a05b67890d
Revises: e3f94a56789c
Create Date: 2026-07-29 01:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a05b67890d'
down_revision: Union[str, None] = 'e3f94a56789c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'user',
        sa.Column('status', sa.String(), server_default='active', nullable=False)
    )
    op.add_column(
        'user',
        sa.Column('must_change_password', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )

    op.create_table(
        'adminauditevent',
        sa.Column('id', sa.Uuid(), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('actor_id', sa.Uuid(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('action_type', sa.String(), nullable=False),
        sa.Column('target_user_id', sa.Uuid(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
    )
    op.create_index('ix_adminauditevent_actor_id', 'adminauditevent', ['actor_id'])
    op.create_index('ix_adminauditevent_target_user_id', 'adminauditevent', ['target_user_id'])


def downgrade() -> None:
    op.drop_index('ix_adminauditevent_target_user_id', table_name='adminauditevent')
    op.drop_index('ix_adminauditevent_actor_id', table_name='adminauditevent')
    op.drop_table('adminauditevent')
    op.drop_column('user', 'must_change_password')
    op.drop_column('user', 'status')
