import express from "express";
import cookieParser from "cookie-parser";
import type { UserRepository } from "./domain/reg/ports/UserRepository";
import type { PasswordHasher } from "./domain/reg/ports/PasswordHasher";
import type { SessionTokenService } from "./domain/reg/ports/SessionTokenService";
import { CustomerRegistrar } from "./domain/reg/CustomerRegistrar";
import { CourierRegistrar } from "./domain/reg/CourierRegistrar";
import { StaffRegistrar } from "./domain/reg/StaffRegistrar";
import { OperatorRegistrar } from "./domain/reg/OperatorRegistrar";
import { authenticate } from "./application/reg/AuthenticateController";
import { RegistrationController } from "./application/reg/RegistrationController";
import { LoginController } from "./application/reg/LoginController";
import { LogoutController } from "./application/reg/LogoutController";
import { CreateOperatorAccountController } from "./application/reg/CreateOperatorAccountController";

import type { RestaurantReadRepository } from "./application/ord/RestaurantReadRepository";
import { RestaurantQueryController } from "./application/ord/RestaurantQueryController";
import type { MenuRepository } from "./application/ord/MenuRepository";
import { MenuService } from "./application/ord/MenuService";
import { MenuController } from "./application/ord/MenuController";

export interface AppDeps {
  users: UserRepository;
  hasher: PasswordHasher;
  tokens: SessionTokenService;
  restaurants: RestaurantReadRepository;
  menu: MenuRepository;
}

export function createApp({ users, hasher, tokens, restaurants, menu }: AppDeps) {
  
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const register = new RegistrationController({
    customer: new CustomerRegistrar(users, hasher),
    courier: new CourierRegistrar(users, hasher),
    staff: new StaffRegistrar(users, hasher),
  });
  const login = new LoginController(users, hasher, tokens);
  const logout = new LogoutController();
  const createOperator = new CreateOperatorAccountController(new OperatorRegistrar(users, hasher));
  const restaurantController = new RestaurantQueryController(restaurants);
  const menuController = new MenuController(new MenuService(menu));

  // Public: the only routes reachable without a session
  app.post("/api/auth/register", register.handle);
  app.post("/api/auth/login", login.handle);
  app.post("/api/auth/logout", logout.handle);



  // Session gate (R-REG-02): every other /api route requires authentication.
  // Please put your own routes after this line !
  
  app.use("/api", authenticate(tokens));
  app.get("/api/restaurants", restaurantController.listRestaurants);
  app.get("/api/restaurants/:restaurantId", restaurantController.getRestaurant);
  app.get("/api/restaurants/:restaurantId/menu", restaurantController.getMenu);

  // UC-ORD-08 Manage Menu: restaurant staff, own restaurant only (checked in MenuService)
  app.post("/api/restaurants/:restaurantId/menu", menuController.add);
  app.patch("/api/restaurants/:restaurantId/menu/:itemId", menuController.update);
  app.delete("/api/restaurants/:restaurantId/menu/:itemId", menuController.remove);

  app.get("/api/auth/me", (req, res) => {
    res.json({ user: req.user });
  });
  app.post("/api/operator/accounts", createOperator.handle);

  return app;
}