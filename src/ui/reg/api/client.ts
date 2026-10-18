export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
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

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const details = Array.isArray(data?.details)
      ? ": " + data.details.map((d: { path: string; message: string }) => `${d.path} ${d.message}`).join(", ")
      : "";
    throw new ApiError(res.status, (data?.error ?? "Request failed") + details);
  }
  return data as T;
}