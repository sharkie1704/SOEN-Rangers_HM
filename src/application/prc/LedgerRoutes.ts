import type { Request, Response } from "express";
import { OrderError } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { LedgerActor, LedgerService } from "./LedgerService.ts";

function toActor(req: Request): LedgerActor | null {
  const user = req.user;
  if (!user || typeof user.id !== "string" || user.id.trim() === "") return null;
  const role = String(user.role).toUpperCase();
  return {
    userId: user.id,
    role: role === Role.OPERATOR ? Role.OPERATOR : user.role,
  };
}

export class LedgerRoutes {
  constructor(private readonly service: LedgerService) {}

  read = async (req: Request, res: Response) => {
    await this.respond(res, async () => {
      res.json(await this.service.read(toActor(req)));
    });
  };

  reset = async (req: Request, res: Response) => {
    await this.respond(res, async () => {
      res.json(await this.service.reset(toActor(req)));
    });
  };

  private async respond(res: Response, action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      if (error instanceof OrderError) {
        const status = error.code === "FORBIDDEN" ? 403 : 400;
        res.status(status).json({ error: error.message, code: error.code });
      } else {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
