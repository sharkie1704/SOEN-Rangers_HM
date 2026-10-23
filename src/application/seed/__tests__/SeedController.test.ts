import { describe, expect, it } from "vitest";
import { Role } from "../../../domain/reg/Role";
import type { PasswordHasher } from "../../../domain/reg/ports/PasswordHasher";
import type { SeedData } from "../SeedData";
import type { SeedRepository } from "../SeedRepository";
import { SeedController } from "../SeedController";

const seedData: SeedData = {
  accounts: [
    {
      id: "customer-id",
      name: "Seed Customer",
      email: "customer@example.com",
      password: "customer-password",
      role: Role.CUSTOMER,
      deliveryLat: 45.5,
      deliveryLng: -73.5,
    },
    {
      id: "staff-id",
      name: "Seed Staff",
      email: "staff@example.com",
      password: "staff-password",
      role: Role.RESTAURANT,
      restaurantId: "restaurant-id",
    },
  ],
  restaurants: [
    {
      id: "restaurant-id",
      name: "Seed Restaurant",
      category: "Dessert",
      description: "Seed restaurant",
      imageUrl: "",
      status: "OPEN",
      menuItems: [
        {
          name: "Seed Menu Item",
          description: "Seed dessert",
          imageUrl: "",
          priceCents: 500,
          available: true,
        },
      ],
    },
  ],
};

describe("SeedController", () => {
  it("hashes account passwords and sends accounts, restaurants, and menus to the repository", async () => {
    const saved: Parameters<SeedRepository["seed"]>[0][] = [];
    const repository: SeedRepository = {
      seed: async (data) => {
        saved.push(data);
      },
    };
    const hasher: PasswordHasher = {
      hash: async (password) => `hashed:${password}`,
      verify: async () => false,
    };

    await new SeedController(repository, hasher).seed(seedData);

    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual({
      accounts: [
        {
          id: "customer-id",
          name: "Seed Customer",
          email: "customer@example.com",
          passwordHash: "hashed:customer-password",
          role: Role.CUSTOMER,
          deliveryLat: 45.5,
          deliveryLng: -73.5,
          restaurantId: null,
        },
        {
          id: "staff-id",
          name: "Seed Staff",
          email: "staff@example.com",
          passwordHash: "hashed:staff-password",
          role: Role.RESTAURANT,
          deliveryLat: null,
          deliveryLng: null,
          restaurantId: "restaurant-id",
        },
      ],
      restaurants: seedData.restaurants,
    });
  });

  it("propagates hashing failures without persisting partial data", async () => {
    let repositoryCalled = false;
    const repository: SeedRepository = {
      seed: async () => {
        repositoryCalled = true;
      },
    };
    const hasher: PasswordHasher = {
      hash: async () => {
        throw new Error("Hashing failed");
      },
      verify: async () => false,
    };

    await expect(new SeedController(repository, hasher).seed(seedData)).rejects.toThrow(
      "Hashing failed",
    );
    expect(repositoryCalled).toBe(false);
  });
});
