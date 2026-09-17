"""
Copper Atlas — Alembic Migration Environment
全局铜矿床图谱 — Alembic 迁移环境

Auto-generates migrations from SQLAlchemy models.
Supports both async and sync database connections.
"""

from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Alembic Config object
config = context.config

# Set up logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from environment variable
database_url = os.getenv(
    "DATABASE_URL_SYNC",
    os.getenv("DATABASE_URL", "postgresql://atlas:atlas_dev@localhost:5432/copper_atlas"),
).replace("+asyncpg", "")
config.set_main_option("sqlalchemy.url", database_url)

# Import all models for autogeneration
from src.database import Base  # noqa: E402
from src.models.deposit import (  # noqa: E402, F401 — ensure all models are loaded
    AlterationType,
    Country,
    Deposit,
    DepositAlteration,
    DepositClassification,
    GeologicalTimeScale,
    MineralParagenesis,
    ProductionHistory,
    ResourceEstimate,
)

# Target metadata
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generate SQL script)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Include spatial objects
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (apply to database)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Support spatial types
            include_schemas=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
