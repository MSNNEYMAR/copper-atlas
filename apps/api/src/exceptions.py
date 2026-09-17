"""
Copper Atlas — Custom Exceptions
全局铜矿床图谱 — 自定义异常

Application-specific exception hierarchy for consistent error handling.
"""

from __future__ import annotations

from typing import Any


class CopperAtlasError(Exception):
    """Base exception for all Copper Atlas application errors."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."
    details: dict[str, Any] | None = None

    def __init__(
        self,
        message: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.message = message or self.message
        self.details = details
        super().__init__(self.message)


class NotFoundError(CopperAtlasError):
    """Resource not found."""
    status_code = 404
    error_code = "NOT_FOUND"
    message = "The requested resource was not found."


class ValidationError(CopperAtlasError):
    """Input validation failed."""
    status_code = 400
    error_code = "VALIDATION_ERROR"
    message = "Invalid request parameters."


class SpatialError(CopperAtlasError):
    """Spatial query error."""
    status_code = 400
    error_code = "SPATIAL_ERROR"
    message = "An error occurred with the spatial query."


class InvalidBboxError(SpatialError):
    """Invalid bounding box."""
    error_code = "INVALID_BBOX"
    message = "Bounding box values must be in WGS84 coordinate range."


class InvalidSRIDError(SpatialError):
    """Unsupported spatial reference system."""
    error_code = "INVALID_SRID"
    message = "The requested spatial reference system is not supported."


class DatabaseError(CopperAtlasError):
    """Database operation failed."""
    status_code = 500
    error_code = "DATABASE_ERROR"
    message = "A database error occurred."


class TileServiceError(CopperAtlasError):
    """Tile server error."""
    status_code = 502
    error_code = "TILE_SERVICE_ERROR"
    message = "The tile server returned an error."
