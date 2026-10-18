import type { Request, Response } from "express";
import { z } from "zod";
import { Role } from "../../domain/reg/Role";
import type { User } from "../../domain/reg/User";
import type { CustomerRegistrar } from "../../domain/reg/CustomerRegistrar";
import type { CourierRegistrar } from "../../domain/reg/CourierRegistrar";
import type { StaffRegistrar } from "../../domain/reg/StaffRegistrar";
import { toUserDto } from "../../technical-services/http/userDto";
import { sendRegistrationError } from "../../technical-services/http/sendRegistrationError";

export interface PublicRegistrars {
  customer: CustomerRegistrar;
  courier: CourierRegistrar;
  staff: StaffRegistrar;
}

const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// bcrypt only uses the first 72 bytes of a password, so reject longer ones
const common = { name: z.string(), email: z.string(), password: z.string().max(72) };

const registrationSchema = z.discriminatedUnion("role", [
  z.object({ ...common, role: z.literal(Role.CUSTOMER), address: latLng }),
  z.object({ ...common, role: z.literal(Role.COURIER) }),
  z.object({ ...common, role: z.literal(Role.RESTAURANT), restaurantId: z.string() }),
]);

export class RegistrationController {
  constructor(private readonly registrars: PublicRegistrars) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    // Public signup can never create an operator (refers to use case UC-REG-04)
    if (req.body?.role === Role.OPERATOR) {
      res.status(403).json({ error: "This role cannot be registered publicly" });
      return;
    }

    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid registration data",
        details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return;
    }

    try {
      const data = parsed.data;
      let user: User;
      // Delegate to the appropriate registrar based on the role (this follows the factory method pattern)
      switch (data.role) {
        case Role.CUSTOMER:
          user = await this.registrars.customer.register(data);
          break;
        case Role.COURIER:
          user = await this.registrars.courier.register(data);
          break;
        case Role.RESTAURANT:
          user = await this.registrars.staff.register(data);
          break;
      }
      res.status(201).json({ user: toUserDto(user) });
    } catch (e) {
      sendRegistrationError(e, res);
    }
  };
}