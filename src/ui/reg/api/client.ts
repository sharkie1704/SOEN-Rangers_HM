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

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });
  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = typeof data === "object" && data !== null ? data : {};
    const message = "error" in body && typeof body.error === "string" ? body.error : "Request failed";
    throw new ApiError(res.status, message, parseErrorDetails(data));
  }
  return data as T;
}