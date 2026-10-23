import type { SeedAccountRecord, SeedRestaurant } from "./SeedData";

export interface SeedRepository {
  seed(data: {
    accounts: SeedAccountRecord[];
    restaurants: SeedRestaurant[];
  }): Promise<void>;
}
