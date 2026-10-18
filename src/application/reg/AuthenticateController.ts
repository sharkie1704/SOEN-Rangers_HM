import type { CookieOptions, Request, Response, NextFunction } from "express";
import { SessionTokenService } from "../../domain/reg/ports/SessionTokenService";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // Planning for 8 hours, but can be changed

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,                                  // JS in the browser can't read it
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",   // https only in production
  maxAge: SESSION_TTL_MS,
};

// The session gate (R-REG-02): no command reaches its handler without a valid session.
export class AuthenticateController {
  constructor(private readonly tokens: SessionTokenService) {}

  // Arrow property so it can be passed straight to Express: app.use(controller.handle)
  handle = (req: Request, res: Response, next: NextFunction): void => {
    const token = this.extractToken(req);
    const session = token ? this.tokens.verify(token) : null;

    if (!session || session.isExpired()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.user = session.toAuthenticatedUser();
    next();
  };

  private extractToken(req: Request): string | null {
    const cookieToken = req.cookies?.[SESSION_COOKIE];
    if (typeof cookieToken === "string" && cookieToken) return cookieToken;

    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    return null;
  }
}