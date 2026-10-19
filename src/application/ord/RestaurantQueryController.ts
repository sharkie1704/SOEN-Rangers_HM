
import type { Request, Response } from "express";
import type { RestaurantReadRepository } from "./RestaurantReadRepository.ts";

export class RestaurantQueryController {
  constructor(private readonly restaurants: RestaurantReadRepository) {}

  listRestaurants = async (_req: Request, res: Response): Promise<void> => {
    try {
      const restaurants = await this.restaurants.listRestaurants();
      res.status(200).json({ restaurants });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  //retrive one specific restaurant 
  getRestaurant = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.restaurantId;

    if (typeof id !== "string" || !id.trim()) {
      res.status(400).json({ error: "Invalid restaurant ID" });
      return;
    }

    try {
      const restaurant = await this.restaurants.findRestaurantById(id);

      if (!restaurant) {
        res.status(404).json({ error: "Restaurant not found" });
        return;
      }

      res.status(200).json({ restaurant });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  //retrive the menu of a specific restaurant

  getMenu = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.restaurantId;

    if (typeof id !== "string" || !id.trim()) {
      res.status(400).json({ error: "Invalid restaurant ID" });
      return;
    }

    try {
      const restaurant = await this.restaurants.findRestaurantById(id);

      if (!restaurant) {
        res.status(404).json({ error: "Restaurant not found" });
        return;
      }

      const menuItems = await this.restaurants.findMenuByRestaurantId(id);
      res.status(200).json({ menuItems });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
