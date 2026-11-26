import type { PromoCode } from "../../domain/promo/PromoCode.ts";

export interface PromoRepository {
  findByCode(code: string): Promise<PromoCode | null>;
}
