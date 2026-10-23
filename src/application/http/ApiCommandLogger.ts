import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

/** Logs each API request and its outcome without recording request bodies or secrets. */
export const apiCommandLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const user = req.user;
    const result = [
      `[API] requestId=${requestId}`,
      `command=${req.method} ${req.path}`,
      `actor=${user?.id ?? "anonymous"}`,
      `role=${user?.role ?? "anonymous"}`,
      `status=${res.statusCode}`,
      `durationMs=${Date.now() - startedAt}`,
    ].join(" ");

    if (res.statusCode >= 400) {
      console.error(`${result} outcome=error`);
    } else {
      console.info(`${result} outcome=success`);
    }
  });

  next();
};
