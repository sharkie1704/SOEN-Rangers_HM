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

let orders: InMemoryOrderRepository;
let service: OrderService;

beforeEach(() => {
  const menu = new FakeMenuCatalog()
    .addRestaurant("rest-a", true, "Demo Bakery")
    .addItem({ menuItemId: 1, restaurantId: "rest-a", name: "Eclair", unitPriceCents: 500 });
  const promos = new PromoService({
    findByCode: async (code) => code === "SAVE20"
      ? new PromoCode("SAVE20", "percent", 20, Money.ZERO, new Date("2027-12-31T23:59:59Z"))
      : null,
  });
  orders = new InMemoryOrderRepository();
  service = new OrderService(orders, menu, new FakePricingSettingsRepository(), undefined, promos);
});

describe("OrderService with promo codes", () => {
  it("matches the documented WELCOME10 worked example", () => {
    const welcome = new PromoCode("WELCOME10", "percent", 10, Money.ZERO, new Date("2027-12-31T23:59:59Z"));
    const fare = welcome.applyTo({
      subtotalCents: 2000,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 0,
      totalCents: 2450,
    });
    expect(fare.promo).toEqual({ code: "WELCOME10", discountCents: 200 });
    expect(fare.totalCents).toBe(2250);
  });

  it("applies a fixed discount and caps it at the subtotal", async () => {
    const fixed = new PromoCode("FIVE", "fixed", 500, Money.ZERO, new Date("2027-12-31T23:59:59Z"));
    const small = await new PromoService({
      findByCode: async () => fixed,
    }).apply({
      subtotalCents: 300,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 200,
      totalCents: 950,
    }, "FIVE");
    expect(small.promo).toEqual({ code: "FIVE", discountCents: 300 });
    expect(small.totalCents).toBe(650);
  });

  it("refuses a second code and preserves the first promo", () => {
    const first = new PromoCode("SAVE20", "percent", 20, Money.ZERO, new Date("2027-12-31T23:59:59Z"));
    const fare = first.applyTo({
      subtotalCents: 2000,
      deliveryFeeCents: 300,
      serviceFeeCents: 150,
      smallOrderSurchargeCents: 0,
      totalCents: 2450,
    });
    const second = new PromoCode("FIVE", "fixed", 500, Money.ZERO, new Date("2027-12-31T23:59:59Z"));
    expect(() => second.applyTo(fare)).toThrow(/already has promo code SAVE20/);
    expect(fare.promo).toEqual({ code: "SAVE20", discountCents: 400 });
  });

  it("rejects promo use with no session or a non-customer role", async () => {
    await expect(service.quote(null, { restaurantId: "rest-a", lines, promoCode: "SAVE20" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.quote({ userId: "operator-1", role: Role.OPERATOR }, { restaurantId: "rest-a", lines, promoCode: "SAVE20" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects expired codes and minimum-order violations", () => {
    const expired = new PromoCode("OLD", "percent", 10, Money.ZERO, new Date("2020-01-01T00:00:00Z"));
    expect(() => expired.validateFor(Money.fromCents(2000, "subtotalCents"), new Date("2026-11-26T00:00:00Z"))).toThrow(/has expired/);

    const minimum = new PromoCode("SAVE20", "percent", 20, Money.fromCents(3000, "minOrderCents"), new Date("2027-12-31T23:59:59Z"));
    expect(() => minimum.validateFor(Money.fromCents(2000, "subtotalCents"), new Date("2026-11-26T00:00:00Z"))).toThrow(/minimum order/);
  });

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

  it("leaves the fare unchanged without a code", async () => {
    const { fare } = await service.quote(alice, { restaurantId: "rest-a", lines });
    expect(fare.promo).toBeUndefined();
    expect(fare.totalCents).toBe(2450);
  });
});
