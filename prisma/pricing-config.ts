import { readFile } from "node:fs/promises";
import { z } from "zod";

export const PRICING_SETTINGS_ID = "default";

// Prisma Int maps to a signed 32-bit PostgreSQL integer.
const cents = z.number().int().min(0).max(2_147_483_647);
const pricingConfigSchema = z.strictObject({
  deliveryFeeCents: cents,
  serviceFeeCents: cents,
  smallOrderThresholdCents: cents,
  smallOrderSurchargeCents: cents,
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
