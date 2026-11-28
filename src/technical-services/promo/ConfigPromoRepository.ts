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
        new Date(`${promo.expiresOn}T23:59:59.999Z`),
      ));
    }
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promos.get(code.trim().toUpperCase()) ?? null;
  }
}
