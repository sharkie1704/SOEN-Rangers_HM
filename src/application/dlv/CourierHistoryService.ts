import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { AssignmentActor } from "./AssignmentService.ts";

export interface CourierHistoryEntry {
  readonly orderId: number;
  readonly restaurantId: string;
  readonly restaurantName: string;
  readonly lines: readonly { readonly name: string; readonly quantity: number }[];
  readonly placedAt: Date;
  readonly deliveredAt: Date | null;
  readonly generatedAt: Date | null;
}

export interface CourierHistoryRepository {
  findCompleted(courierId: string): Promise<readonly CourierHistoryEntry[]>;
}

export class CourierHistoryService {
  constructor(private readonly history: CourierHistoryRepository) {}

  async list(actor: AssignmentActor | null): Promise<readonly CourierHistoryEntry[]> {
    if (!actor || actor.role !== Role.COURIER || !actor.userId.trim()) {
      throw new AssignmentError("FORBIDDEN", "Only an authenticated courier can view delivery history.");
    }
    return this.history.findCompleted(actor.userId);
  }
}
