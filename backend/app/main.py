from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.config import Settings
from backend.app.db import get_session
from backend.app.generated.models import ApiError, HealthStatus


def create_app(settings: Settings | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        config = settings if settings is not None else Settings()
        engine = create_async_engine(
            config.database_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3},
        )
        app.state.session_factory = async_sessionmaker(engine, expire_on_commit=False)
        try:
            yield
        finally:
            await engine.dispose()

    app = FastAPI(title="Call Calendar API", version="0.1.0", lifespan=lifespan)

    @app.get(
        "/api/health",
        operation_id="getHealth",
        response_model=HealthStatus,
        responses={503: {"model": ApiError}},
    )
    async def get_health(
        session: Annotated[AsyncSession, Depends(get_session)],
    ) -> HealthStatus | JSONResponse:
        try:
            await session.execute(text("SELECT 1"))
        except SQLAlchemyError:
            error = ApiError(
                code="DATABASE_UNAVAILABLE", message="Database is temporarily unavailable."
            )
            return JSONResponse(status_code=503, content=error.model_dump(mode="json"))
        return HealthStatus(status="ok", database="ok")

    return app
