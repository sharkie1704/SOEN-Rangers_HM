import type { RequestHandler } from "express";

/** Logs each API request and its outcome without recording request bodies or secrets. */
export const apiCommandLogger: RequestHandler = (req, res, next) => {
  res.on("finish", () => {
    const outcome = res.statusCode >= 400 ? " ERROR" : "";
    console.info(`[API] ${req.method} ${req.path} -> ${res.statusCode}${outcome}`);
  });

  next();
};
