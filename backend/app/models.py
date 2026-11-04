from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db import Base


class Calendar(Base):
    __tablename__ = "calendars"
    __table_args__ = (CheckConstraint("id = 1", name="ck_single_calendar"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    timezone: Mapped[str] = mapped_column(String(64))


class EventTypeRecord(Base):
    __tablename__ = "event_types"
    __table_args__ = (
        CheckConstraint("id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name="ck_event_type_id"),
        CheckConstraint("char_length(id) BETWEEN 1 AND 64", name="ck_event_type_id_length"),
        CheckConstraint("char_length(btrim(name)) BETWEEN 1 AND 120", name="ck_event_type_name"),
        CheckConstraint("char_length(description) <= 2000", name="ck_event_type_description"),
        CheckConstraint("duration_minutes BETWEEN 1 AND 540", name="ck_event_type_duration"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(2000))
    duration_minutes: Mapped[int] = mapped_column(Integer)
