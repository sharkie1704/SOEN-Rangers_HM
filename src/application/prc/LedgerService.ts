import { OrderError } from "../../domain/ord/OrderError.ts";
import { Role } from "../../domain/reg/Role.ts";
import type { LedgerRepository, LedgerSnapshot } from "./LedgerRepository.ts";

export interface LedgerActor {
  readonly userId: string;
  readonly role: Role;
}

export class LedgerService {
  constructor(private readonly ledger: LedgerRepository) {}

  async read(actor: LedgerActor | null): Promise<LedgerSnapshot> {
    this.requireOperator(actor);
    return this.ledger.read();
  }

  async reset(actor: LedgerActor | null): Promise<{ readonly epoch: number }> {
    this.requireOperator(actor);
    return { epoch: await this.ledger.startNewEpoch() };
  }

  private requireOperator(actor: LedgerActor | null): void {
    if (!actor || !actor.userId.trim() || actor.role !== Role.OPERATOR) {
      throw new OrderError("FORBIDDEN", "Only an authenticated operator can view or reset the billing ledger.");
    }
  }
}
