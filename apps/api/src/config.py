"""
Copper Atlas — Application Configuration
全局铜矿床图谱 — 应用配置

Uses Pydantic Settings for type-safe, environment-variable-driven configuration.
All settings have sensible defaults for local development.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # === Application ===
    app_name: str = "Copper Atlas API"
    app_version: str = "0.1.0"
    environment: str = "development"  # development | staging | production
    debug: bool = True

    # === Database ===
    database_url: str = "postgresql+asyncpg://atlas:atlas_dev@localhost:5432/copper_atlas"
    database_url_sync: str = "postgresql://atlas:atlas_dev@localhost:5432/copper_atlas"
    database_pool_size: int = 20
    database_max_overflow: int = 10
    database_pool_timeout: int = 30
    database_echo: bool = False  # Set to True to log all SQL queries

    # === Redis ===
    redis_url: str = "redis://localhost:6379/0"

    # === Martin Tile Server ===
    martin_url: str = "http://localhost:3000"

    # === CORS ===
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    # === Rate Limiting ===
    rate_limit_enabled: bool = True
    rate_limit_default: str = "100/minute"
    rate_limit_tiles: str = "200/minute"

    # === Logging ===
    log_level: str = "DEBUG"  # DEBUG | INFO | WARNING | ERROR

    # === OpenTelemetry ===
    otel_enabled: bool = False
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"

    # === Spatial ===
    default_srid: int = 4326  # WGS84
    web_mercator_srid: int = 3857
    max_bbox_area_deg2: float = 360.0 * 180.0  # Prevent querying the entire planet
    max_page_size: int = 200

    # === Data ===
    max_nearby_radius_km: float = 500.0

    # === Project Paths ===
    @property
    def base_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent

    @property
    def alembic_dir(self) -> Path:
        return self.base_dir / "alembic"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
