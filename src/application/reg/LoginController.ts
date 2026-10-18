import type { Request, Response } from "express";
import { z } from "zod";
import type { UserRepository } from "../../domain/reg/ports/UserRepository";
import type { PasswordHasher } from "../../domain/reg/ports/PasswordHasher";
import type { SessionTokenService } from "../../domain/reg/ports/SessionTokenService";
import { Session } from "../../domain/reg/Session";
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions } from "./AuthenticateController";
import { toUserDto } from "../../technical-services/http/userDto";

const loginSchema = z.object({ email: z.string(), password: z.string() });

export class LoginController {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: SessionTokenService,
  ) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const email = parsed.data.email.trim().toLowerCase();
      const { password } = parsed.data;
      const user = await this.users.findByEmail(email);

      if (!user) {
        await this.hasher.hash(password); // So response time doesn't reveal which emails exist
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      if (!(await this.hasher.verify(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const session = Session.forUser(user, SESSION_TTL_MS);
      res.cookie(SESSION_COOKIE, this.tokens.issue(session), sessionCookieOptions);
      res.status(200).json({ user: toUserDto(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}