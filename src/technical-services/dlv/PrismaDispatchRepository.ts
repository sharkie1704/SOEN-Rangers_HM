import { prisma } from "../db/PrismaClient.ts";
import type { CourierCandidate, Position } from "../../domain/dlv/DispatchRule.ts";
import type { DispatchRepository } from "../../application/dlv/DispatchRepository.ts";

export class PrismaDispatchRepository implements DispatchRepository {
  async findRestaurantPosition(restaurantId: string): Promise<Position | undefined> {
    const row = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { lat: true, lng: true } });
    return row?.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : undefined;
  }

  // Assignment.courierId has no foreign key to User, so the exclusions are looked up first.
  // A courier can still be taken after this query; the one-active-offer index catches that when saving.
  async findCandidates(orderId: number): Promise<CourierCandidate[]> {
    const excluded = await prisma.assignment.findMany({
      where: { OR: [{ status: { in: ["OFFERED", "ACCEPTED"] } }, { orderId, status: "DECLINED" }] },
      select: { courierId: true },
      distinct: ["courierId"],
    });
    const rows = await prisma.user.findMany({
      where: {
        role: "COURIER",
        courierStatus: "IDLE",
        courierLat: { not: null },
        courierLng: { not: null },
        id: { notIn: excluded.map((row) => row.courierId) },
      },
      select: { id: true, courierLat: true, courierLng: true },
    });
    return rows.flatMap((row) => row.courierLat != null && row.courierLng != null
      ? [{ courierId: row.id, position: { lat: row.courierLat, lng: row.courierLng } }]
      : []);
  }
}
