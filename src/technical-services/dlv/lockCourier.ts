import type { CourierStatus } from "../../domain/dlv/states/CourierState.ts";
import type { prisma } from "../db/PrismaClient.ts";

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Locks the courier's row until the transaction ends and returns its current status,
// or undefined when there is no such courier. Anything that changes a courier together
// with their assignment locks this row first, so those changes run one at a time.
export async function lockCourier(tx: Tx, courierId: string): Promise<CourierStatus | undefined> {
  const [row] = await tx.$queryRaw<{ status: CourierStatus }[]>`
    SELECT "courierStatus"::text AS status FROM "User"
    WHERE id = ${courierId} AND role = 'COURIER'
    FOR UPDATE`;
  return row?.status;
}
