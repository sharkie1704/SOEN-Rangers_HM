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
    const normalized = normalizePromoCode(code);
    const promo = await this.promos.findByCode(normalized);
    if (!promo) {
      throw new OrderError("INVALID_INPUT", `Promo code ${normalized} does not exist.`);
    }
    return promo.applyTo(fare);
  }
}
