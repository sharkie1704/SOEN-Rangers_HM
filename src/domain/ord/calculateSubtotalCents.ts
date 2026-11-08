import type { OrderLine } from "./OrderLine.ts";
import { OrderError } from "./OrderError.ts";

export function calculateSubtotalCents(
  lines: readonly OrderLine[],
): number {
  // Add the line totals to get the subtotal in cents.
  const subtotalCents = lines.reduce(
    (subtotal, line) => subtotal + line.totalCents,
    0,
  );

  // Reject totals that are too large to calculate exactly.
  if (!Number.isSafeInteger(subtotalCents)) {
    throw new OrderError(
      "INVALID_INPUT",
      "Order total exceeds the supported amount.",
    );
  }

  return subtotalCents;
}
