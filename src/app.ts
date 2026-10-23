import express, { type RequestHandler } from "express";
import { hasPermission, type PermissionCommand } from "./domain/reg/permissions";
import cookieParser from "cookie-parser";
import { apiCommandLogger } from "./application/http/ApiCommandLogger";
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
import type { RestaurantStatusRepository } from "./application/ord/RestaurantStatusRepository";
import { RestaurantStatusService } from "./application/ord/RestaurantStatusService";
import { RestaurantStatusController } from "./application/ord/RestaurantStatusController";
import { OrderController } from "./application/ord/OrderController";
import { OrderRoutes } from "./application/ord/OrderRoutes";
import type { OrderRepository } from "./application/ord/OrderRepository";
import type { MenuCatalog } from "./application/ord/MenuCatalog";
import { OrderService } from "./application/ord/OrderService";
import { toUserDto } from "./technical-services/http/userDto";

export interface AppDeps {
  users: UserRepository;
  hasher: PasswordHasher;
  tokens: SessionTokenService;
  restaurants: RestaurantReadRepository;
  menu: MenuRepository;
  restaurantStatus: RestaurantStatusRepository;
  orders?: OrderRepository;
  orderMenu?: MenuCatalog;
}

// Session authentication runs before these permission gates.
function requirePermission(command: PermissionCommand): RequestHandler {
  return (req, res, next) => {
    if (!hasPermission(command, req.user)) {
      res.status(403).json({ error: "Permission denied" });
      return;
    }
    next();
  };
}

export function createApp({ users, hasher, tokens, restaurants, menu, restaurantStatus, orders, orderMenu }: AppDeps) {
  
  const app = express();
  app.use("/api", apiCommandLogger);
  app.use(express.json());
  app.use(cookieParser());

  const register = new RegistrationController({
    customer: new CustomerRegistrar(users, hasher),
    courier: new CourierRegistrar(users, hasher),
    staff: new StaffRegistrar(users, hasher),
  }, restaurants);
  const login = new LoginController(users, hasher, tokens);
  const logout = new LogoutController();
  const createOperator = new CreateOperatorAccountController(new OperatorRegistrar(users, hasher));
  const restaurantController = new RestaurantQueryController(restaurants);
  const menuController = new MenuController(new MenuService(menu));
  const statusController = new RestaurantStatusController(new RestaurantStatusService(restaurantStatus));

  // Public: the only routes reachable without a session
  app.post("/api/auth/register", register.handle);
  app.post("/api/auth/login", login.handle);
  app.post("/api/auth/logout", logout.handle);



  // Session gate (R-REG-02): every other /api route requires authentication.
  // Please put your own routes after this line !
  
  app.use("/api", authenticate(tokens));
  if (orders && orderMenu) {
    const orderRoutes = new OrderRoutes(new OrderController(new OrderService(orders, orderMenu)));
    app.post("/api/orders", orderRoutes.place);
    app.get("/api/orders", orderRoutes.listMine);
    app.get("/api/orders/:orderId", orderRoutes.getOne);
    app.post("/api/orders/:orderId/cancel", orderRoutes.cancel);
    app.post("/api/orders/:orderId/accept", orderRoutes.accept);
    app.post("/api/orders/:orderId/reject", orderRoutes.reject);
    app.post("/api/orders/:orderId/ready", orderRoutes.markReady);
    app.get("/api/restaurants/:restaurantId/orders/incoming", orderRoutes.incoming);
    app.get("/api/restaurants/:restaurantId/orders/queue", orderRoutes.queue);
  }
  app.get("/api/restaurants", requirePermission({ name: "browseRestaurants" }), restaurantController.listRestaurants);
  app.get("/api/restaurants/:restaurantId", requirePermission({ name: "browseRestaurants" }), restaurantController.getRestaurant);
  app.get("/api/restaurants/:restaurantId/menu", requirePermission({ name: "browseMenu" }), restaurantController.getMenu);

  app.post("/api/restaurants/:restaurantId/menu", menuController.add);
  app.patch("/api/restaurants/:restaurantId/menu/:itemId", menuController.update);
  app.delete("/api/restaurants/:restaurantId/menu/:itemId", menuController.remove);
  app.patch("/api/restaurants/:restaurantId/status", statusController.update);

  app.get("/api/auth/me", requirePermission({ name: "viewProfile" }), async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const user = await users.findById(req.user.id);

    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    res.json({ user: toUserDto(user) });
  } catch (error) {
    console.error("Failed to retrieve user profile:", error);
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});
  app.post("/api/operator/accounts", createOperator.handle);

  return app;
}
