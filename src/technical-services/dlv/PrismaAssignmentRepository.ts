import { prisma } from "../db/PrismaClient.ts";
import type { AssignmentStatus as DbAssignmentStatus } from "../../generated/prisma/client.ts";
import { Assignment, type AssignmentStatus } from "../../domain/dlv/Assignment.ts";
import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import type { CourierAvailability } from "../../domain/dlv/CourierAvailability.ts";
import type { AssignmentRepository, OfferAnsweredEvent } from "../../application/dlv/AssignmentRepository.ts";
import type { CourierStatusEvent } from "../../application/dlv/CourierAvailabilityRepository.ts";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const toDbStatus: Record<AssignmentStatus, DbAssignmentStatus> = {
  Offered: "OFFERED",
  Accepted: "ACCEPTED",
  Declined: "DECLINED",
};

const fromDbStatus = Object.fromEntries(
  Object.entries(toDbStatus).map(([key, value]) => [value, key]),
) as Record<DbAssignmentStatus, AssignmentStatus>;

const activeStatuses: DbAssignmentStatus[] = ["OFFERED", "ACCEPTED"];

export class PrismaAssignmentRepository implements AssignmentRepository {
  async nextEventId(): Promise<number> {
    const [row] = await prisma.$queryRaw<{ id: bigint }[]>`SELECT nextval('"AssignmentEvent_id_seq"') AS id`;
    return Number(row.id);
  }

  async findActiveByOrderId(orderId: number): Promise<Assignment | undefined> {
    const row = await prisma.assignment.findFirst({ where: { orderId, status: { in: activeStatuses } } });
    return row ? new Assignment(row.orderId, row.courierId, fromDbStatus[row.status]) : undefined;
  }

  async saveAccepted(assignment: Assignment, event: OfferAnsweredEvent, courier: CourierAvailability, courierEvent: CourierStatusEvent): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await this.answer(tx, assignment, event, "ACCEPT");
      const { count } = await tx.user.updateMany({
        where: { id: courier.courierId, role: "COURIER", courierStatus: courierEvent.fromStatus },
        data: { courierStatus: courier.status },
      });
      if (count === 0) {
        throw new AssignmentError("CONFLICT", "Courier status just changed. Reload it and try again.");
      }
      await tx.courierStatusEvent.create({
        data: {
          id: courierEvent.eventId,
          courierId: courierEvent.courierId,
          actorId: courierEvent.actorId,
          fromStatus: courierEvent.fromStatus,
          toStatus: courierEvent.toStatus,
          occurredAt: courierEvent.occurredAt,
        },
      });
    });
  }

  async saveDeclined(assignment: Assignment, event: OfferAnsweredEvent): Promise<void> {
    await prisma.$transaction((tx) => this.answer(tx, assignment, event, "DECLINE"));
  }

  private async answer(tx: Tx, assignment: Assignment, event: OfferAnsweredEvent, action: "ACCEPT" | "DECLINE"): Promise<void> {
    const offer = await tx.assignment.findFirst({
      where: { orderId: assignment.orderId, courierId: assignment.courierId, status: "OFFERED" },
      select: { id: true },
    });
    if (!offer) {
      throw new AssignmentError("CONFLICT", "This offer was already answered. Reload it and try again.");
    }
    const { count } = await tx.assignment.updateMany({
      where: { id: offer.id, status: "OFFERED" },
      data: { status: toDbStatus[assignment.status] },
    });
    if (count === 0) {
      throw new AssignmentError("CONFLICT", "This offer was already answered. Reload it and try again.");
    }
    await tx.assignmentEvent.create({
      data: { id: event.eventId, assignmentId: offer.id, actorId: event.courierId, action, occurredAt: event.occurredAt },
    });
  }
}
