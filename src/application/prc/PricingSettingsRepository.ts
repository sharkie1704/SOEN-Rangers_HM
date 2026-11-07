import type { PricingConfig } from "../../domain/prc/FareCalculator.ts";

export interface PricingSettingsRepository {
  getSettings(): Promise<PricingConfig>;
}
