import asyncio
import os
from collections.abc import AsyncIterator
from typing import cast

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.config import Settings
from backend.app.main import create_app
from backend.tests.contract import assert_contract_response

pytestmark = pytest.mark.integration


@pytest.fixture
def test_database_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.fail("TEST_DATABASE_URL is required; see README.md or run mise run test:unit")
    test_url = make_url(url)
    app_url = os.environ.get("DATABASE_URL")
    if not test_url.database or not test_url.database.endswith("_test"):
        pytest.fail("TEST_DATABASE_URL must use a dedicated database ending in _test")
    if app_url and test_url == make_url(app_url):
        pytest.fail("TEST_DATABASE_URL must differ from DATABASE_URL")
    Settings(database_url=url)
    return url


@pytest.fixture
async def postgres_app(
    test_database_url: str, monkeypatch: pytest.MonkeyPatch
) -> AsyncIterator[FastAPI]:
    monkeypatch.setenv("DATABASE_URL", test_database_url)
    await asyncio.to_thread(command.upgrade, Config("alembic.ini"), "head")
    app = create_app(Settings(database_url=test_database_url))
    async with app.router.lifespan_context(app):
        yield app


async def test_real_postgresql_health(postgres_app: FastAPI) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=postgres_app), base_url="http://test"
    ) as client:
        responses = await asyncio.gather(*(client.get("/api/health") for _ in range(3)))
    for response in responses:
        assert response.status_code == 200
        assert_contract_response(response)


async def test_separate_sessions_for_parallel_work(postgres_app: FastAPI) -> None:
    factory = cast(async_sessionmaker[AsyncSession], postgres_app.state.session_factory)
    async with factory() as first, factory() as second:
        assert first is not second
        rows = await asyncio.gather(
            first.scalar(text("SELECT pg_backend_pid()")),
            second.scalar(text("SELECT pg_backend_pid()")),
        )
        assert rows[0] != rows[1]


async def test_baseline_migration_roundtrip(
    test_database_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DATABASE_URL", test_database_url)
    config = Config("alembic.ini")
    await asyncio.to_thread(command.downgrade, config, "base")
    await asyncio.to_thread(command.upgrade, config, "head")
    engine = create_async_engine(test_database_url)
    try:
        async with engine.connect() as connection:
            assert await connection.scalar(text("SELECT version_num FROM alembic_version")) == (
                "0001_baseline"
            )
        await asyncio.to_thread(command.check, config)
    finally:
        await engine.dispose()
