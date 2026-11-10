import type { RequestHandler } from "express";
import { publishCommandEvent, publishOutputEvent } from "./CommandEvents";

/** Logs each API request and its outcome without recording request bodies or secrets. */
export const apiCommandLogger: RequestHandler = (req, res, next) => {
  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0] || req.path;
    if (path === "/api/command-events") return;

    const outcome = res.statusCode >= 400 ? " ERROR" : "";
    console.info(`[API] ${req.method} ${path} -> ${res.statusCode}${outcome}`);
    publishCommandEvent(req.method, res.statusCode);
    publishOutputEvent({ method: req.method, path, status: res.statusCode });
  });

  next();
};
