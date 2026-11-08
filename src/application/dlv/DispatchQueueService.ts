import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import { DispatchQueue } from "../../domain/dlv/DispatchQueue.ts";
import { hasPermission } from "../../domain/reg/permissions";
import type { AssignmentActor } from "./AssignmentService.ts";
import type { DispatchQueueRepository } from "./DispatchQueueRepository.ts";

export class DispatchQueueService {
  constructor(private readonly queue: DispatchQueueRepository) {}

  async current(): Promise<DispatchQueue> {
    return new DispatchQueue(await this.queue.listWaiting());
  }

  async view(actor: AssignmentActor | null): Promise<DispatchQueue> {
    if (!actor || !hasPermission({ name: "viewDispatchQueue" }, { ...actor, id: actor.userId })) {
      throw new AssignmentError("FORBIDDEN", "Only an operator can view the dispatch queue.");
    }
    return this.current();
  }
}
