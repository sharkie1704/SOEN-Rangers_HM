import type { Request, Response } from "express";
import { OrderError } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { OrderSummaryActor, OrderSummaryService } from "./OrderSummaryService.ts";

function toActor(req: Request): OrderSummaryActor | null {
  const user = req.user;
  if (!user || typeof user.id !== "string" || user.id.trim() === "") return null;
  const role = String(user.role).toUpperCase();
  if (role === Role.CUSTOMER || role === Role.OPERATOR) {
    return { userId: user.id, role };
  }
  return { userId: user.id, role: user.role };
}

export class OrderSummaryRoutes {
  constructor(private readonly service: OrderSummaryService) {}

  list = async (req: Request, res: Response) => {
    return this.respond(res, async () => {
      res.json({ summaries: await this.service.list(toActor(req)) });
    });
  };

  private async respond(res: Response, action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      if (error instanceof OrderError) {
        const status = error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 400;
        res.status(status).json({ error: error.message, code: error.code });
      } else {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
