import type { PromoRepository } from "../../application/promo/PromoRepository.ts";
import { Money } from "../../domain/prc/Money.ts";
import { PromoCode } from "../../domain/promo/PromoCode.ts";

export interface PromoConfig {
  readonly code: string;
  readonly type: "percent" | "fixed";
  readonly value: number;
  readonly expiresOn: string;
  readonly minOrderValue: number;
}

export const PROMO_TIME_ZONE = "America/Montreal";

function offsetMillis(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const wallClock = Date.UTC(field("year"), field("month") - 1, field("day"), field("hour"), field("minute"), field("second"));
  return wallClock - Math.floor(instant.getTime() / 1000) * 1000;
}

export function endOfDay(isoDate: string, timeZone: string = PROMO_TIME_ZONE): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  const wallClockEnd = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  return new Date(wallClockEnd - offsetMillis(new Date(wallClockEnd), timeZone));
}

export class ConfigPromoRepository implements PromoRepository {
  private readonly promos = new Map<string, PromoCode>();

  constructor(config: readonly PromoConfig[]) {
    for (const promo of config) {
      const normalized = promo.code.trim().toUpperCase();
      this.promos.set(normalized, new PromoCode(
        normalized,
        promo.type,
        promo.value,
        Money.fromCents(promo.minOrderValue, "minOrderValue"),
        endOfDay(promo.expiresOn),
      ));
    }
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promos.get(code.trim().toUpperCase()) ?? null;
  }
}
