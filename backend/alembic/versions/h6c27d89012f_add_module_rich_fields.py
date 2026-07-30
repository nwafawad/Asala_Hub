"""add_module_rich_fields

Revision ID: h6c27d89012f
Revises: g5b16c78901e
Create Date: 2026-07-30 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h6c27d89012f'
down_revision: Union[str, None] = 'g5b16c78901e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('module', sa.Column('title_ar', sa.String(), nullable=True))
    op.add_column('module', sa.Column('duration_minutes', sa.Integer(), nullable=True))
    op.add_column('module', sa.Column('points', sa.Integer(), nullable=True))
    op.add_column('module', sa.Column('due_date', sa.DateTime(), nullable=True))
    op.add_column('module', sa.Column('media_url', sa.String(), nullable=True))
    op.add_column('module', sa.Column('video_offline_text', sa.String(), nullable=True))
    op.add_column('module', sa.Column('quiz_schema', sa.JSON(), nullable=True))
    op.add_column('module', sa.Column('assignment_schema', sa.JSON(), nullable=True))
    op.add_column('module', sa.Column('media_variants', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('module', 'media_variants')
    op.drop_column('module', 'assignment_schema')
    op.drop_column('module', 'quiz_schema')
    op.drop_column('module', 'video_offline_text')
    op.drop_column('module', 'media_url')
    op.drop_column('module', 'due_date')
    op.drop_column('module', 'points')
    op.drop_column('module', 'duration_minutes')
    op.drop_column('module', 'title_ar')
