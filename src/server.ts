// For Node
import "dotenv/config";
import { createApp } from "./app";
import { PrismaUserRepository } from "./technical-services/reg/PrismaUserRepository";
import { BcryptPasswordHasher } from "./technical-services/reg/BcryptPasswordHasher";
import { JwtSessionTokenService } from "./technical-services/reg/JwtSessionTokenService";
import { PrismaRestaurantReadRepository } from "./technical-services/ord/PrismaRestaurantReadRepository";
import { PrismaMenuRepository } from "./technical-services/ord/PrismaMenuRepository";
import { PrismaRestaurantStatusRepository } from "./technical-services/ord/PrismaRestaurantStatusRepository";
import { PrismaOrderRepository } from "./technical-services/ord/PrismaOrderRepository";
import { PrismaMenuCatalog } from "./technical-services/ord/PrismaMenuCatalog";

const app = createApp({
  users: new PrismaUserRepository(),
  hasher: new BcryptPasswordHasher(),
  tokens: new JwtSessionTokenService(process.env.JWT_SECRET ?? ""),
  restaurants: new PrismaRestaurantReadRepository(),
  menu: new PrismaMenuRepository(),
  restaurantStatus: new PrismaRestaurantStatusRepository(),
  orders: new PrismaOrderRepository(),
  menuCatalog: new PrismaMenuCatalog(),
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});