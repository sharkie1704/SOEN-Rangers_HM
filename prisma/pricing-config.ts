import { readFile } from "node:fs/promises";
import { z } from "zod";

export const PRICING_SETTINGS_ID = "default";

// Prisma Int maps to a signed 32-bit PostgreSQL integer.
const cents = z.number().int().min(0).max(2_147_483_647);
const promoConfigSchema = z.strictObject({
  code: z.string().trim().min(1).regex(/^[A-Z0-9_-]+$/),
  type: z.enum(["percent", "fixed"]),
  value: cents,
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minOrderValue: cents,
});
const pricingConfigSchema = z.strictObject({
  deliveryFeeCents: cents,
  serviceFeeCents: cents,
  smallOrderThresholdCents: cents,
  smallOrderSurchargeCents: cents,
  promos: z.array(promoConfigSchema).default([]),
});

export function parsePricingConfig(contents: string) {
  // JSON.parse rejects malformed JSON; Zod checks the required fields and values.
  const input: unknown = JSON.parse(contents);
  return pricingConfigSchema.parse(input);
}

export async function loadPricingConfig(
  path: URL = new URL("../config/pricing.json", import.meta.url),
) {
  const contents = await readFile(path, "utf8");
  return parsePricingConfig(contents);
}
