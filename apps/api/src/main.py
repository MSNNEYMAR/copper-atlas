"""
Copper Atlas — FastAPI Application Entry Point
全局铜矿床图谱 — FastAPI 应用入口

FastAPI application factory with middleware, routers, and OpenAPI configuration.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, ORJSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .database import check_database_connection
from .exceptions import CopperAtlasError
from .logging_config import setup_logging

settings = get_settings()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown events."""
    # Startup
    setup_logging()
    logger.info(
        "application.starting",
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )

    db_ok = await check_database_connection()
    if db_ok:
        logger.info("database.connected")
    else:
        logger.error("database.connection_failed")

    yield

    # Shutdown
    logger.info("application.shutting_down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="""
        ## Global Copper Deposits Atlas API — 全球铜矿床图谱 API

        A professional geological platform for exploring global copper deposits.

        ### Features
        - **GeoJSON API**: Spatial queries with bounding box, radius, and filters
        - **OGC API - Features**: Standards-compliant geospatial data access
        - **Vector Tiles**: High-performance MVT tiles via Martin tile server
        - **Statistics**: Aggregated data by country, type, grade, and tonnage
        - **Provenance**: W3C PROV-O compliant data traceability

        ### Data Standards
        - Spatial Reference: WGS84 (EPSG:4326)
        - Classification: IUGS hierarchical deposit classification
        - Time Scale: ICS 2024 International Chronostratigraphic Chart
        - Provenance: W3C PROV-O
        """,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # === Middleware ===
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    # GZip compression for GeoJSON responses
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # === Exception Handlers ===
    @app.exception_handler(CopperAtlasError)
    async def handle_copper_atlas_error(request: Request, exc: CopperAtlasError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(RateLimitExceeded)
    async def handle_rate_limit(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                }
            },
        )

    # === Health Check ===
    @app.get("/health", tags=["Health"])
    async def health_check():
        """Health check endpoint for monitoring and load balancers."""
        db_ok = await check_database_connection()
        return {
            "status": "ok" if db_ok else "degraded",
            "version": settings.app_version,
            "environment": settings.environment,
            "database": "connected" if db_ok else "disconnected",
        }

    # === Routers ===
    from .api.v1.router import api_router

    app.include_router(api_router, prefix="/api/v1")

    # === OpenTelemetry ===
    if settings.otel_enabled:
        _setup_opentelemetry(app)

    return app


def _setup_opentelemetry(app: FastAPI) -> None:
    """Configure OpenTelemetry instrumentation."""
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource.create({SERVICE_NAME: settings.app_name})
        provider = TracerProvider(resource=resource)
        provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint))
        )
        trace.set_tracer_provider(provider)

        FastAPIInstrumentor.instrument_app(app)
        # SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)  # Requires engine in scope

        logger.info("opentelemetry.configured")
    except ImportError:
        logger.warning("opentelemetry.not_installed")


# Create the application instance
app = create_app()
