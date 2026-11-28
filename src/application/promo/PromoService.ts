import { OrderError } from "../../domain/ord/OrderError.ts";
import type { FareBreakdown } from "../../domain/prc/FareBreakdown.ts";
import { normalizePromoCode } from "../../domain/promo/PromoCode.ts";
import type { PromoRepository } from "./PromoRepository.ts";

export class PromoService {
  private readonly promos: PromoRepository;

  constructor(promos: PromoRepository) {
    this.promos = promos;
  }

  async apply(fare: FareBreakdown, code: unknown): Promise<FareBreakdown> {
    let normalized: string;
    try {
      normalized = normalizePromoCode(code);
    } catch (error) {
      console.warn(`[PROMO] refused code=${JSON.stringify(code ?? null)} reason=missing`);
      throw error;
    }
    const promo = await this.promos.findByCode(normalized);
    if (!promo) {
      console.warn(`[PROMO] refused code=${normalized} reason=unknown`);
      throw new OrderError("INVALID_INPUT", `Promo code ${normalized} does not exist.`);
    }
    try {
      const applied = promo.applyTo(fare);
      console.info(`[PROMO] applied code=${applied.promo?.code} discountCents=${applied.promo?.discountCents}`);
      return applied;
    } catch (error) {
      if (error instanceof OrderError) {
        console.warn(`[PROMO] refused code=${normalized} reason=${error.message}`);
      }
      throw error;
    }
  }
}
