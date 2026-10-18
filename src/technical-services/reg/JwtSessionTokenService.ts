import jwt from "jsonwebtoken";
import { Role } from "../../domain/reg/Role";
import { Session } from "../../domain/reg/Session";
import { SessionTokenService } from "../../domain/reg/ports/SessionTokenService";

export class JwtSessionTokenService implements SessionTokenService {
  constructor(private readonly secret: string) {
    if (!secret || secret.length < 16) {
      throw new Error("JWT secret must be at least 16 characters");
    }
  }

  issue(session: Session): string {
    return jwt.sign(
      {
        sub: session.userId,
        role: session.role,
        rid: session.restaurantId,
        exp: Math.floor(session.expiresAt.getTime() / 1000),
      },
      this.secret,
      { algorithm: "HS256" }, // blocks the classic “alg: none” and algorithm-swap attacks
    );
  }

  verify(token: string): Session | null {
    try {
      const p = jwt.verify(token, this.secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      if (!p.sub || !p.exp || !Object.values(Role).includes(p.role)) return null;
      return new Session(p.sub, p.role as Role, p.rid ?? null, new Date(p.exp * 1000));
    } catch {
      return null; // bad signature, malformed, or expired
    }
  }
}