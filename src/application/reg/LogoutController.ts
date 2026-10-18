import type { Request, Response } from "express";
import { SESSION_COOKIE, sessionCookieOptions } from "./AuthenticateController";

// Logout if public on purpose, so someone with expired session can still clear the cookie
export class LogoutController {
  handle = (_req: Request, res: Response): void => {
    const { maxAge: _ignored, ...options } = sessionCookieOptions;
    res.clearCookie(SESSION_COOKIE, options);
    res.status(204).end();
  };
}