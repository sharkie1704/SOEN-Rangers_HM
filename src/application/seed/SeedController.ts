import type { PasswordHasher } from "../../domain/reg/ports/PasswordHasher";
import type { SeedData, SeedAccountRecord } from "./SeedData";
import type { SeedRepository } from "./SeedRepository";

export class SeedController {
  constructor(
    private readonly repository: SeedRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async seed(data: SeedData): Promise<void> {
    const accounts: SeedAccountRecord[] = await Promise.all(
      data.accounts.map(async (account) => {
        const common = {
          id: account.id,
          name: account.name,
          email: account.email,
          passwordHash: await this.hasher.hash(account.password),
          role: account.role,
          deliveryLat: null,
          deliveryLng: null,
          restaurantId: null,
        };

        if (account.role === "CUSTOMER") {
          return {
            ...common,
            deliveryLat: account.deliveryLat,
            deliveryLng: account.deliveryLng,
          };
        }

        if (account.role === "RESTAURANT") {
          return { ...common, restaurantId: account.restaurantId };
        }

        return common;
      }),
    );

    await this.repository.seed({ accounts, restaurants: data.restaurants });
  }
}
