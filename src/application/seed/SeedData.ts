import { Role } from "../../domain/reg/Role";

export type SeedAccount =
  | {
      id: string;
      name: string;
      email: string;
      password: string;
      role: Role.CUSTOMER;
      deliveryLat: number;
      deliveryLng: number;
    }
  | {
      id: string;
      name: string;
      email: string;
      password: string;
      role: Role.COURIER | Role.OPERATOR;
    }
  | {
      id: string;
      name: string;
      email: string;
      password: string;
      role: Role.RESTAURANT;
      restaurantId: string;
    };

export interface SeedMenuItem {
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  available: boolean;
}

export interface SeedRestaurant {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
  menuItems: SeedMenuItem[];
}

export interface SeedData {
  accounts: SeedAccount[];
  restaurants: SeedRestaurant[];
}

export type SeedAccountRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  deliveryLat: number | null;
  deliveryLng: number | null;
  restaurantId: string | null;
};
