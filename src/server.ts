// For Node
import "dotenv/config";
import { createApp } from "./app";
import { PrismaUserRepository } from "./technical-services/reg/PrismaUserRepository";
import { BcryptPasswordHasher } from "./technical-services/reg/BcryptPasswordHasher";
import { JwtSessionTokenService } from "./technical-services/reg/JwtSessionTokenService";
import { PrismaRestaurantReadRepository } from "./technical-services/ord/PrismaRestaurantReadRepository";
import { SeedController } from "./application/seed/SeedController";
import { loadSeedConfig } from "./technical-services/seed/loadSeedConfig";
import { PrismaSeedRepository } from "./technical-services/seed/PrismaSeedRepository";

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    const seeder = new SeedController(new PrismaSeedRepository(), new BcryptPasswordHasher());
    await seeder.seed(await loadSeedConfig());
  }

  const app = createApp({
    users: new PrismaUserRepository(),
    hasher: new BcryptPasswordHasher(),
    tokens: new JwtSessionTokenService(process.env.JWT_SECRET ?? ""),
    restaurants: new PrismaRestaurantReadRepository(),
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start API server:", error);
  process.exitCode = 1;
});