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

