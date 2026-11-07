import { prisma } from "../db/PrismaClient.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import type { OrderSummary } from "../../domain/prc/OrderSummary.ts";
import type { OrderSummaryRepository } from "../../application/prc/OrderSummaryRepository.ts";

const withOrderLines = {
  order: { include: { lines: { orderBy: { position: "asc" } } } },
} satisfies Prisma.OrderSummaryInclude;

type SummaryRow = Prisma.OrderSummaryGetPayload<{ include: typeof withOrderLines }>;

export class PrismaOrderSummaryRepository implements OrderSummaryRepository {
  async findByCustomer(customerId: string): Promise<readonly OrderSummary[]> {
    const rows = await prisma.orderSummary.findMany({
      where: { customerId },
      include: withOrderLines,
      orderBy: { deliveredAt: "desc" },
    });
    return rows.map(toSummary);
  }

  async findAll(): Promise<readonly OrderSummary[]> {
    const rows = await prisma.orderSummary.findMany({
      include: withOrderLines,
      orderBy: { deliveredAt: "desc" },
    });
    return rows.map(toSummary);
  }
}

function toSummary(row: SummaryRow): OrderSummary {
  return Object.freeze({
    orderId: row.orderId,
    customerId: row.customerId,
    restaurantId: row.restaurantId,
    restaurantName: row.restaurantName,
    lines: Object.freeze(row.order.lines.map((line) => Object.freeze({
      menuItemId: line.menuItemId,
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    }))),
    fare: Object.freeze({
      subtotalCents: row.subtotalCents,
      deliveryFeeCents: row.deliveryFeeCents,
      serviceFeeCents: row.serviceFeeCents,
      smallOrderSurchargeCents: row.smallOrderSurchargeCents,
      totalCents: row.totalCents,
    }),
    placedAt: row.placedAt,
    deliveredAt: row.deliveredAt,
    generatedAt: row.generatedAt,
  });
}
