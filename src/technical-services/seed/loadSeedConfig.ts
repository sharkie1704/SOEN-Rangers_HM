import { readFile } from "node:fs/promises";
import { z } from "zod";
import { Role } from "../../domain/reg/Role";
import type { SeedData } from "../../application/seed/SeedData";

const nonEmptyString = z.string().trim().min(1);
const accountBase = {
  id: nonEmptyString,
  name: nonEmptyString,
  email: z.email(),
  password: z.string().min(1).max(72),
};

const accountSchema = z.discriminatedUnion("role", [
  z.object({
    ...accountBase,
    role: z.literal(Role.CUSTOMER),
    deliveryLat: z.number().min(-90).max(90),
    deliveryLng: z.number().min(-180).max(180),
  }),
  z.object({ ...accountBase, role: z.literal(Role.COURIER) }),
  z.object({
    ...accountBase,
    role: z.literal(Role.RESTAURANT),
    restaurantId: nonEmptyString,
  }),
  z.object({ ...accountBase, role: z.literal(Role.OPERATOR) }),
]);

const seedConfigSchema = z.object({
  accounts: z.array(accountSchema),
  restaurants: z.array(
    z.object({
      id: nonEmptyString,
      name: nonEmptyString,
      category: nonEmptyString,
      description: z.string(),
      imageUrl: z.string(),
      status: z.enum(["OPEN", "PAUSED", "CLOSED"]),
      menuItems: z.array(
        z.object({
          name: nonEmptyString,
          description: z.string(),
          imageUrl: z.string(),
          priceCents: z.number().int().nonnegative(),
          available: z.boolean(),
        }),
      ),
    }),
  ),
}).superRefine((config, context) => {
  const restaurantIds = new Set(config.restaurants.map((restaurant) => restaurant.id));
  const emails = new Set<string>();

  for (const [index, account] of config.accounts.entries()) {
    const email = account.email.trim().toLowerCase();
    if (emails.has(email)) {
      context.addIssue({
        code: "custom",
        path: ["accounts", index, "email"],
        message: "Seeded account emails must be unique",
      });
    }
    emails.add(email);

    if (account.role === Role.RESTAURANT && !restaurantIds.has(account.restaurantId)) {
      context.addIssue({
        code: "custom",
        path: ["accounts", index, "restaurantId"],
        message: `Unknown seeded restaurant "${account.restaurantId}"`,
      });
    }
  }
});

export async function loadSeedConfig(): Promise<SeedData> {
  const contents = await readFile(new URL("../../../config.json", import.meta.url), "utf8");
  const parsed = seedConfigSchema.safeParse(JSON.parse(contents));

  if (!parsed.success) {
    throw new Error(`Invalid seed configuration: ${parsed.error.message}`);
  }

  return parsed.data;
}
