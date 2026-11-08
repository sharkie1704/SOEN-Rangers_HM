
import type { PricingSettingsRepository } from "../../application/prc/PricingSettingsRepository.ts";
import type { PricingConfig } from "../../domain/prc/FareCalculator.ts";
import { prisma } from "../db/PrismaClient.ts";

export class PrismaPricingSettingsRepository
  implements PricingSettingsRepository {

  async getSettings(): Promise<PricingConfig> {
    const settings = await prisma.pricingSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      throw new Error("Pricing settings not found in database.");
    }

    return {
      deliveryFeeCents: settings.deliveryFeeCents,
      serviceFeeCents: settings.serviceFeeCents,
      smallOrderThresholdCents: settings.smallOrderThresholdCents,
      smallOrderSurchargeCents: settings.smallOrderSurchargeCents,
    };
  }
}
