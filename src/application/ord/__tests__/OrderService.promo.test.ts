import { beforeEach, describe, expect, it } from "vitest";
import { Money } from "../../../domain/prc/Money.ts";
import { PromoCode } from "../../../domain/promo/PromoCode.ts";
import { Role } from "../../../domain/reg/Role.ts";
import { PromoService } from "../../promo/PromoService.ts";
import type { OrderActor } from "../OrderActor.ts";
import { OrderService } from "../OrderService.ts";
import { FakeMenuCatalog, FakePricingSettingsRepository, InMemoryOrderRepository } from "./fakes.ts";

const alice: OrderActor = { userId: "cust-alice", role: Role.CUSTOMER };
const lines = [{ menuItemId: 1, quantity: 4 }];
const fixedNow = new Date("2026-11-27T12:00:00Z");

const seededPromos: Record<string, PromoCode> = {
  SAVE20: new PromoCode("SAVE20", 20, Money.ZERO, new Date("2027-12-31T23:59:59Z")),
  BIG30: new PromoCode("BIG30", 20, Money.fromCents(3000, "minOrderCents"), new Date("2027-12-31T23:59:59Z")),
  SPRING15: new PromoCode("SPRING15", 15, Money.ZERO, new Date("2026-05-31T23:59:59Z")),
};

let orders: InMemoryOrderRepository;
let service: OrderService;

beforeEach(() => {
  const menu = new FakeMenuCatalog()
    .addRestaurant("rest-a", true, "Demo Bakery")
    .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Eclair", unitPriceCents: 500 });
  const promos = new PromoService(
    { findByCode: async (code) => seededPromos[code] ?? null },
    () => fixedNow,
  );
  orders = new InMemoryOrderRepository();
  service = new OrderService(orders, menu, new FakePricingSettingsRepository(), undefined, promos);
});

describe("OrderService with promo codes", () => {
  it("shows the discount in the quote", async () => {
    const { fare } = await service.quote(alice, { restaurantId: "rest-a", lines, promoCode: "save20" });
    expect(fare).toEqual({
      subtotalCents: 2000,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 0,
      totalCents: 2050,
      promo: { code: "SAVE20", discountCents: 400 },
    });
  });

  it("checks the code again at placement and saves the discounted fare on the order", async () => {
    const order = await service.place(alice, {
      restaurantId: "rest-a", lines, promoCode: "SAVE20", expectedTotalCents: 2050,
    });
    expect(order.fare.totalCents).toBe(2050);
    expect(order.fare.promo).toEqual({ code: "SAVE20", discountCents: 400 });
    const [saved] = await orders.findAll();
    expect(saved.fare?.promo).toEqual({ code: "SAVE20", discountCents: 400 });
  });

  it("refuses to place an order with an unknown code", async () => {
    await expect(service.place(alice, { restaurantId: "rest-a", lines, promoCode: "FAKE" }))
      .rejects.toMatchObject({ code: "INVALID_INPUT", message: "Promo code FAKE does not exist." });
    expect(await orders.findAll()).toEqual([]);
  });

  it("rejects an expired promo code for quote and placement", async () => {
    await expect(service.quote(alice, { restaurantId: "rest-a", lines, promoCode: "SPRING15" }))
      .rejects.toMatchObject({ code: "INVALID_INPUT", message: "Promo code SPRING15 has expired." });
    await expect(service.place(alice, { restaurantId: "rest-a", lines, promoCode: "SPRING15" }))
      .rejects.toMatchObject({ code: "INVALID_INPUT", message: "Promo code SPRING15 has expired." });
    expect(await orders.findAll()).toEqual([]);
  });

  it("rejects a promo code when the subtotal is below its minimum order", async () => {
    await expect(service.quote(alice, { restaurantId: "rest-a", lines, promoCode: "BIG30" }))
      .rejects.toMatchObject({ code: "INVALID_INPUT", message: "Promo code BIG30 requires a minimum order of $30.00." });
    await expect(service.place(alice, { restaurantId: "rest-a", lines, promoCode: "BIG30" }))
      .rejects.toMatchObject({ code: "INVALID_INPUT", message: "Promo code BIG30 requires a minimum order of $30.00." });
    expect(await orders.findAll()).toEqual([]);
  });

  it("applies a promo code when the subtotal meets its minimum order", async () => {
    const qualifyingLines = [{ menuItemId: 1, quantity: 6 }]; // $30.00 subtotal
    const { fare } = await service.quote(alice, { restaurantId: "rest-a", lines: qualifyingLines, promoCode: "BIG30" });
    expect(fare.promo).toEqual({ code: "BIG30", discountCents: 600 });
    expect(fare.totalCents).toBe(2850);
  });

  it("leaves the fare unchanged without a code", async () => {
    const { fare } = await service.quote(alice, { restaurantId: "rest-a", lines });
    expect(fare.promo).toBeUndefined();
    expect(fare.totalCents).toBe(2450);
  });
});
