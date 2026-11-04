import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.tests.contract import assert_contract_response

pytestmark = pytest.mark.integration


async def test_created_event_type_is_in_public_catalog(
    postgres_app: FastAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ORGANIZER_ACCESS_TOKEN", "test-organizer-key")
    body = {
        "id": "discovery",
        "name": "  Знакомство  ",
        "description": "Обсудим задачу",
        "durationMinutes": 45,
    }
    async with AsyncClient(
        transport=ASGITransport(app=postgres_app), base_url="http://test"
    ) as client:
        created = await client.post(
            "/api/organizer/event-types",
            json=body,
            headers={"Authorization": "Bearer test-organizer-key"},
        )
        assert created.status_code == 201
        assert created.json() == {**body, "name": "Знакомство"}
        assert_contract_response(created)
        catalog = await client.get("/api/event-types")
        assert catalog.json() == {"items": [created.json()]}
        assert_contract_response(catalog)


async def test_duplicate_id_does_not_replace_event_and_catalog_is_sorted(
    postgres_app: FastAPI,
) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=postgres_app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/event-types")).json() == {"items": []}
        for id in ["z-review", "a-intro"]:
            created = await client.post(
                "/api/organizer/event-types",
                json={
                    "id": id,
                    "name": id,
                    "description": "",
                    "durationMinutes": 30,
                },
                headers={"Authorization": "Bearer test-organizer-key"},
            )
            assert created.status_code == 201
            assert_contract_response(created)
        duplicate = await client.post(
            "/api/organizer/event-types",
            json={
                "id": "z-review",
                "name": "Replacement",
                "description": "",
                "durationMinutes": 60,
            },
            headers={"Authorization": "Bearer test-organizer-key"},
        )
        assert duplicate.status_code == 409
        assert duplicate.json()["code"] == "EVENT_TYPE_ID_TAKEN"
        assert_contract_response(duplicate)
        catalog = await client.get("/api/event-types")
        assert catalog.json() == {
            "items": [
                {"id": "a-intro", "name": "a-intro", "description": "", "durationMinutes": 30},
                {"id": "z-review", "name": "z-review", "description": "", "durationMinutes": 30},
            ]
        }
        assert_contract_response(catalog)


@pytest.mark.parametrize(
    "authorization", [None, "Bearer wrong", "Basic test-organizer-key", "Bearer", "Bearer неверный"]
)
async def test_create_requires_organizer_access(
    postgres_app: FastAPI, authorization: str | None
) -> None:
    headers = {"Authorization": authorization} if authorization else {}
    # HTTP headers are byte sequences; use UTF-8 explicitly for malformed Unicode credentials.
    request_headers = {name.encode(): value.encode() for name, value in headers.items()}
    async with AsyncClient(
        transport=ASGITransport(app=postgres_app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/organizer/event-types",
            json={
                "id": "intro",
                "name": "Intro",
                "description": "",
                "durationMinutes": 30,
            },
            headers=request_headers,
        )
        assert response.status_code == 401
        assert response.json()["code"] == "ORGANIZER_ACCESS_DENIED"
        assert_contract_response(response)
        assert (await client.get("/api/event-types")).json() == {"items": []}


@pytest.mark.parametrize(
    "field,value",
    [
        ("id", ""),
        ("id", "a" * 65),
        ("id", "Upper"),
        ("id", "two--parts"),
        ("id", "-intro"),
        ("id", "intro-"),
        ("id", "has space"),
        ("id", "встреча"),
        ("name", "   "),
        ("name", "n" * 121),
        ("description", "d" * 2001),
        ("durationMinutes", 0),
        ("durationMinutes", 541),
        ("durationMinutes", 30.5),
        ("durationMinutes", "30"),
        ("durationMinutes", True),
        ("undeclared", "private"),
    ],
)
async def test_invalid_event_type_is_not_created(
    postgres_app: FastAPI, field: str, value: object
) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=postgres_app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/organizer/event-types",
            json={
                "id": "intro",
                "name": "Intro",
                "description": "",
                "durationMinutes": 30,
                field: value,
            },
            headers={"Authorization": "Bearer test-organizer-key"},
        )
        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"
        assert_contract_response(response)
        assert (await client.get("/api/event-types")).json() == {"items": []}


@pytest.mark.parametrize("duration", [1, 45, 540])
async def test_event_type_accepts_limits_after_trimming_name(
    postgres_app: FastAPI, duration: int
) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=postgres_app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/organizer/event-types",
            json={
                "id": "a" * 64,
                "name": "  " + "n" * 120 + "  ",
                "description": "d" * 2000,
                "durationMinutes": duration,
            },
            headers={"Authorization": "Bearer test-organizer-key"},
        )
        assert response.status_code == 201
        assert response.json()["name"] == "n" * 120
        assert_contract_response(response)


async def test_missing_server_key_fails_closed(test_database_url: str) -> None:
    from backend.app.config import Settings
    from backend.app.main import create_app

    app = create_app(Settings(database_url=test_database_url, organizer_access_token=None))
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.post(
            "/api/organizer/event-types",
            json={
                "id": "intro",
                "name": "Intro",
                "description": "",
                "durationMinutes": 30,
            },
            headers={"Authorization": "Bearer test-organizer-key"},
        )
        assert response.status_code == 401
        assert_contract_response(response)


async def test_catalog_survives_application_restart(
    postgres_app: FastAPI, test_database_url: str
) -> None:
    from backend.app.config import Settings
    from backend.app.main import create_app

    async with AsyncClient(
        transport=ASGITransport(app=postgres_app), base_url="http://test"
    ) as client:
        created = await client.post(
            "/api/organizer/event-types",
            json={
                "id": "persistent",
                "name": "Сохранённый тип",
                "description": "",
                "durationMinutes": 30,
            },
            headers={"Authorization": "Bearer test-organizer-key"},
        )
        assert created.status_code == 201
    restarted = create_app(Settings(database_url=test_database_url))
    async with (
        restarted.router.lifespan_context(restarted),
        AsyncClient(transport=ASGITransport(app=restarted), base_url="http://test") as client,
    ):
        catalog = await client.get("/api/event-types")
        assert catalog.json() == {"items": [created.json()]}
        assert_contract_response(catalog)


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/event-types"),
        ("POST", "/api/organizer/event-types"),
        ("GET", "/api/event-types/intro/slots"),
    ],
)
async def test_database_unavailable_has_no_connection_details(
    test_database_url: str, method: str, path: str
) -> None:
    from sqlalchemy.engine import make_url

    from backend.app.config import Settings
    from backend.app.main import create_app

    unavailable = make_url(test_database_url).set(port=1).render_as_string(hide_password=False)
    app = create_app(
        Settings(database_url=unavailable, organizer_access_token="test-organizer-key")
    )
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client,
    ):
        response = await client.request(
            method,
            path,
            json={
                "id": "intro",
                "name": "Intro",
                "description": "",
                "durationMinutes": 30,
            }
            if method == "POST"
            else None,
            headers={"Authorization": "Bearer test-organizer-key"},
        )
        assert response.status_code == 503
        assert response.json()["code"] == "DATABASE_UNAVAILABLE"
        assert "postgresql" not in response.text
        assert "127.0.0.1" not in response.text
        assert_contract_response(response)
