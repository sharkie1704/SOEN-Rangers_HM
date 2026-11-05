import { beforeEach, describe, expect, it, vi } from "vitest";
import { Courier } from "../../../domain/reg/Courier";
import { Customer } from "../../../domain/reg/Customer";
import { PrismaUserRepository } from "../PrismaUserRepository";

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("../../db/PrismaClient", () => ({ prisma: { user: { upsert } } }));

const account = { id: "user-1", name: "Casey", email: "casey@example.com", passwordHash: "hash" };

describe("PrismaUserRepository.save", () => {
  beforeEach(() => upsert.mockReset());

  it("creates couriers off duty without touching the status of an existing courier", async () => {
    await new PrismaUserRepository().save(new Courier(account));
    const { create, update } = upsert.mock.calls[0][0];
    expect(create.courierStatus).toBe("OFFLINE");
    expect(update).not.toHaveProperty("courierStatus");
  });

  it("gives other roles no courier status", async () => {
    await new PrismaUserRepository().save(new Customer({ ...account, address: { lat: 45.5, lng: -73.57 } }));
    expect(upsert.mock.calls[0][0].create).not.toHaveProperty("courierStatus");
  });
});
