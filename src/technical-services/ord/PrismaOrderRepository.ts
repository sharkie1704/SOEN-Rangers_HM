import { prisma } from "../db/PrismaClient.ts";
import { Prisma, type OrderAction as DbOrderAction, type OrderStatus as DbOrderStatus } from "../../generated/prisma/client.ts";
import { Order } from "../../domain/ord/Order.ts";
import { OrderError } from "../../domain/ord/OrderError.ts";
import { PreparationQueue } from "../../domain/ord/PreparationQueue.ts";
import type { OrderAction, OrderStatus, StateChangeEvent } from "../../domain/ord/StateChangeEvent.ts";
import type { OrderRepository } from "../../application/ord/OrderRepository.ts";

const toDbStatus: Record<OrderStatus, DbOrderStatus> = {
  Placed: "PLACED",
  Accepted: "ACCEPTED",
  Preparing: "PREPARING",
  Ready: "READY",
  Rejected: "REJECTED",
  Cancelled: "CANCELLED",
};

const toDbAction: Record<OrderAction, DbOrderAction> = {
  place: "PLACE",
  accept: "ACCEPT",
  reject: "REJECT",
  cancel: "CANCEL",
  "start-preparing": "START_PREPARING",
  "mark-ready": "MARK_READY",
};

const fromDbStatus = invert(toDbStatus);
const fromDbAction = invert(toDbAction);

const withHistory = {
  lines: { orderBy: { position: "asc" } },
  events: { orderBy: { id: "asc" } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof withHistory }>;
type EventRow = OrderRow["events"][number];
type Db = typeof prisma | Prisma.TransactionClient;

export class PrismaOrderRepository implements OrderRepository {
  // Inside withQueueLock this is the transaction client, so every call joins that transaction
  constructor(private readonly db: Db = prisma) {}

  async nextOrderId(): Promise<number> {
    const [row] = await this.db.$queryRaw<{ id: bigint }[]>`SELECT nextval('"Order_id_seq"') AS id`;
    return Number(row.id);
  }

  async nextEventId(): Promise<number> {
    const [row] = await this.db.$queryRaw<{ id: bigint }[]>`SELECT nextval('"OrderEvent_id_seq"') AS id`;
    return Number(row.id);
  }

  async add(order: Order): Promise<void> {
    await this.db.order.create({
      data: {
        id: order.id,
        restaurantId: order.restaurantId,
        customerId: order.customerId,
        status: toDbStatus[order.status],
        placedAt: order.placedAt,
        lines: {
          create: order.lines.map((line, position) => ({
            position,
            menuItemId: line.menuItemId,
            name: line.name,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
          })),
        },
        events: { create: order.events.map((event) => this.toEventRow(event)) },
      },
    });
  }

  async save(order: Order): Promise<void> {
    await this.transaction(async (tx) => {
      const stored = await tx.orderEvent.findMany({ where: { orderId: order.id }, select: { id: true } });
      const storedIds = new Set(stored.map((event) => event.id));
      const pending = order.events.filter((event) => !storedIds.has(event.eventId));
      if (pending.length === 0) return;

      // Only apply the change if nobody else moved the order since it was loaded
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: toDbStatus[pending[0].from] },
        data: { status: toDbStatus[order.status] },
      });
      if (count === 0) {
        throw new OrderError("CONFLICT", "Order was changed by someone else. Reload it and try again.");
      }
      await tx.orderEvent.createMany({
        data: pending.map((event) => ({ ...this.toEventRow(event), orderId: order.id })),
      });
    });
  }

  async findById(orderId: number): Promise<Order | undefined> {
    const row = await this.db.order.findUnique({ where: { id: orderId }, include: withHistory });
    return row ? this.toDomain(row) : undefined;
  }

  async findByRestaurant(restaurantId: string): Promise<readonly Order[]> {
    const rows = await this.db.order.findMany({ where: { restaurantId }, include: withHistory, orderBy: { id: "asc" } });
    return rows.map((row) => this.toDomain(row));
  }

  async findByCustomer(customerId: string): Promise<readonly Order[]> {
    const rows = await this.db.order.findMany({ where: { customerId }, include: withHistory, orderBy: { placedAt: "desc" } });
    return rows.map((row) => this.toDomain(row));
  }

  async withQueueLock<T>(restaurantId: string, work: (orders: OrderRepository) => Promise<T>): Promise<T> {
    return this.transaction(async (tx) => {
      // Released when the transaction ends
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${restaurantId}::text))`;
      return work(new PrismaOrderRepository(tx));
    });
  }

  // The queue is not stored; it is every Accepted/Preparing order in the order they were accepted
  async getPreparationQueue(restaurantId: string): Promise<PreparationQueue> {
    const rows = await this.db.order.findMany({
      where: { restaurantId, status: { in: ["ACCEPTED", "PREPARING"] } },
      include: withHistory,
    });
    const acceptedEventId = (row: OrderRow) => row.events.find((event) => event.action === "ACCEPT")?.id ?? 0;
    rows.sort((a, b) => acceptedEventId(a) - acceptedEventId(b));
    return PreparationQueue.restore(restaurantId, rows.map((row) => this.toDomain(row)));
  }

  // Joins the surrounding transaction when there is one
  private transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return "$transaction" in this.db ? this.db.$transaction(work) : work(this.db);
  }

  private toDomain(row: OrderRow): Order {
    return Order.restore({
      id: row.id,
      restaurantId: row.restaurantId,
      customerId: row.customerId,
      lines: row.lines.map((line) => ({
        menuItemId: line.menuItemId,
        name: line.name,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
      })),
      placedAt: row.placedAt,
      status: fromDbStatus[row.status],
      events: row.events.map((event) => this.toDomainEvent(event)),
    });
  }

  private toDomainEvent(row: EventRow): StateChangeEvent {
    return {
      eventId: row.id,
      orderId: row.orderId,
      actorId: row.actorId,
      action: fromDbAction[row.action],
      from: fromDbStatus[row.fromStatus],
      to: fromDbStatus[row.toStatus],
      occurredAt: row.occurredAt,
      ...(row.reason === null ? {} : { reason: row.reason }),
    };
  }

  private toEventRow(event: StateChangeEvent) {
    return {
      id: event.eventId,
      actorId: event.actorId,
      action: toDbAction[event.action],
      fromStatus: toDbStatus[event.from],
      toStatus: toDbStatus[event.to],
      reason: event.reason ?? null,
      occurredAt: event.occurredAt,
    };
  }
}

function invert<K extends string, V extends string>(map: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Record<V, K>;
}
