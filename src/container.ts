import { JwtSessionTokenService } from "./technical-services/reg/JwtSessionTokenService";
import { AuthenticateController } from "./application/reg/AuthenticateController";

export const tokens = new JwtSessionTokenService(process.env.JWT_SECRET ?? "");
export const requireAuth = new AuthenticateController(tokens).handle;