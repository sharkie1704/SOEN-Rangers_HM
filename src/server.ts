// For Node
import "dotenv/config";
import { createApp } from "./app";
import { PrismaUserRepository } from "./technical-services/reg/PrismaUserRepository";
import { BcryptPasswordHasher } from "./technical-services/reg/BcryptPasswordHasher";
import { JwtSessionTokenService } from "./technical-services/reg/JwtSessionTokenService";
import { PrismaRestaurantReadRepository } from "./technical-services/ord/PrismaRestaurantReadRepository";

const app = createApp({
  users: new PrismaUserRepository(),
  hasher: new BcryptPasswordHasher(),
  tokens: new JwtSessionTokenService(process.env.JWT_SECRET ?? ""),
  restaurants: new PrismaRestaurantReadRepository(),
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});