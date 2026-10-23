import { recordOutput } from "../../console/outputLog";

export interface ApiErrorDetail {
  path: string;
  message: string;
}


export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
function parseErrorDetails(data: unknown): ApiErrorDetail[] {
  if (typeof data !== "object" || data === null || !("details" in data) || !Array.isArray(data.details)) {
    return [];
  }

  return data.details.filter(
    (detail): detail is ApiErrorDetail =>
      typeof detail === "object" &&
      detail !== null &&
      "path" in detail &&
      typeof detail.path === "string" &&
      "message" in detail &&
      typeof detail.message === "string",
  );
}

function responseLogDetails(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";
  const body = data as Record<string, unknown>;
  const transition = typeof body.transition === "object" && body.transition !== null
    ? body.transition as Record<string, unknown>
    : undefined;
  const order = typeof body.order === "object" && body.order !== null
    ? body.order as Record<string, unknown>
    : transition?.order && typeof transition.order === "object"
      ? transition.order as Record<string, unknown>
      : undefined;

  const details: string[] = [];
  if (typeof order?.id === "number") details.push(`orderId=${order.id}`);

  let eventId = typeof transition?.eventId === "number"
    ? transition.eventId
    : typeof body.eventId === "number"
      ? body.eventId
      : undefined;
  if (eventId === undefined && Array.isArray(order?.events)) {
    const latestEvent = order.events.at(-1);
    if (typeof latestEvent === "object" && latestEvent !== null && "eventId" in latestEvent
      && typeof latestEvent.eventId === "number") {
      eventId = latestEvent.eventId;
    }
  }
  if (eventId !== undefined) details.push(`eventId=${eventId}`);

  return details.length > 0 ? ` ${details.join(" ")}` : "";
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  try {
    const res = await fetch(path, {
      method,
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });
    if (res.status === 204) {
      recordOutput(`${method} ${path} completed (${res.status})`);
      return undefined as T;
    }

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const body = typeof data === "object" && data !== null ? data : {};
      const message = "error" in body && typeof body.error === "string" ? body.error : "Request failed";
      recordOutput(`${method} ${path} failed (${res.status}): ${message}`, "error");
      throw new ApiError(res.status, message, parseErrorDetails(data));
    }

    recordOutput(`${method} ${path} completed (${res.status})${responseLogDetails(data)}`);
    return data as T;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      const message = error instanceof Error ? error.message : "Network request failed";
      recordOutput(`${method} ${path} failed: ${message}`, "error");
    }
    throw error;
  }
}

