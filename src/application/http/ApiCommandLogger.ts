import type { RequestHandler } from "express";
import { publishCommandEvent } from "./CommandEvents";

/** Logs each API request and its outcome without recording request bodies or secrets. */
export const apiCommandLogger: RequestHandler = (req, res, next) => {
  res.on("finish", () => {
    const outcome = res.statusCode >= 400 ? " ERROR" : "";
    console.info(`[API] ${req.method} ${req.path} -> ${res.statusCode}${outcome}`);
    publishCommandEvent(req.method, res.statusCode);
  });

  next();
};
