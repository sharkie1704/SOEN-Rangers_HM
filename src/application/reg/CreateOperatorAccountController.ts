import type { Request, Response } from "express";
import { z } from "zod";
import { hasPermission } from "../../domain/reg/permissions";
import type { OperatorRegistrar } from "../../domain/reg/OperatorRegistrar";
import { toUserDto } from "../../technical-services/http/UserDTO";
import { sendRegistrationError } from "../../technical-services/http/SendRegistrationError";

const schema = z.object({ name: z.string(), email: z.string(), password: z.string().max(72) });

// This allows existing operators to create new operator accounts (UC-REG-04)
export class CreateOperatorAccountController {
  constructor(private readonly operators: OperatorRegistrar) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission({ name: "createOperator" }, req.user)) {
      res.status(403).json({ error: "Operator access required" });
      return;
    }
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid account data" });
      return;
    }
    try {
      const user = await this.operators.register(parsed.data);
      res.status(201).json({ user: toUserDto(user) });
    } catch (e) {
      sendRegistrationError(e, res);
    }
  };
}