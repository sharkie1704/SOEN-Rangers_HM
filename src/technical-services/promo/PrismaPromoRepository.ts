import type { PromoRepository } from "../../application/promo/PromoRepository.ts";
import { Money } from "../../domain/prc/Money.ts";
import { PromoCode } from "../../domain/promo/PromoCode.ts";
import { prisma } from "../db/PrismaClient.ts";

export class PrismaPromoRepository implements PromoRepository {
  async findByCode(code: string): Promise<PromoCode | null> {
    const row = await prisma.promoCode.findUnique({ where: { code } });
    if (!row) return null;
    return new PromoCode(
      row.code,
      row.type as "percent" | "fixed",
      row.value,
      Money.fromCents(row.minOrderCents, "minOrderCents"),
      row.expiresAt,
    );
  }
}
