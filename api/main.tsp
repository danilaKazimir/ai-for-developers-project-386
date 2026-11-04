import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Call Calendar API" })
@info(#{ version: "0.1.0" })
namespace CallCalendar;

/** The API and its PostgreSQL connection are ready. */
model HealthStatus {
  status: "ok";
  database: "ok";
}

/** A public error without database connection details. */
model ApiError {
  code: "DATABASE_UNAVAILABLE";
  message: string;
}

@error
model ServiceUnavailableError {
  @statusCode statusCode: 503;
  @body body: ApiError;
}

/** Check that the API can execute a query against PostgreSQL. */
@route("/api/health")
@get
@operationId("getHealth")
op getHealth(): HealthStatus | ServiceUnavailableError;

/** Meeting format shared by the organizer's single calendar. */
model EventType {
  @minLength(1) @maxLength(64) @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  id: string;
  /** Leading and trailing whitespace is removed before length validation. */
  @minLength(1) @maxLength(120)
  name: string;
  @maxLength(2000)
  description: string;
  @minValue(1) @maxValue(540)
  durationMinutes: int32;
}

/** Input name must have 1–120 characters after trimming surrounding whitespace. */
model CreateEventTypeRequest {
  id: EventType.id;
  @pattern("^\\s*\\S(?:[\\s\\S]{0,118}\\S)?\\s*$")
  name: string;
  description: EventType.description;
  durationMinutes: EventType.durationMinutes;
}

model EventTypeCatalog {
  items: EventType[];
}

@error model AccessDeniedError {
  @statusCode statusCode: 401;
  @body body: { code: "ORGANIZER_ACCESS_DENIED"; message: string; };
}
@error model EventTypeConflictError {
  @statusCode statusCode: 409;
  @body body: { code: "EVENT_TYPE_ID_TAKEN"; message: string; };
}
@error model ValidationError {
  @statusCode statusCode: 422;
  @body body: { code: "VALIDATION_ERROR"; message: string; };
}
@error model InternalError {
  @statusCode statusCode: 500;
  @body body: { code: "INTERNAL_ERROR"; message: string; };
}

@route("/api/organizer/event-types")
@post
@useAuth(BearerAuth)
@operationId("createEventType")
op createEventType(@body eventType: CreateEventTypeRequest): {
  @statusCode statusCode: 201;
  @body body: EventType;
} | AccessDeniedError | EventTypeConflictError | ValidationError | ServiceUnavailableError | InternalError;

@route("/api/event-types")
@get
@operationId("listEventTypes")
op listEventTypes(): EventTypeCatalog | ServiceUnavailableError | InternalError;

/** A real interval, normalized to UTC in responses. */
model Slot {
  startsAt: utcDateTime;
  endsAt: utcDateTime;
}

model SlotDay {
  date: plainDate;
  slots: Slot[];
}

model EventTypeSlots {
  eventType: EventType;
  timezone: string;
  windowStartDate: plainDate;
  windowEndDateExclusive: plainDate;
  days: SlotDay[];
}

@error model EventTypeNotFoundError {
  @statusCode statusCode: 404;
  @body body: { code: "EVENT_TYPE_NOT_FOUND"; message: string; };
}

@route("/api/event-types/{eventTypeId}/slots")
@get
@operationId("getEventTypeSlots")
op getEventTypeSlots(@path eventTypeId: EventType.id): EventTypeSlots
  | EventTypeNotFoundError | ValidationError | ServiceUnavailableError | InternalError;
