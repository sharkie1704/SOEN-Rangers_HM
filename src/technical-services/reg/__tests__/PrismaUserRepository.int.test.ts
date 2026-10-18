// Separate to keep fast unit tests DB-free

import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../../db/prismaClient";
import { PrismaUserRepository } from "../PrismaUserRepository";
import { BcryptPasswordHasher } from "../BcryptPasswordHasher";
import { CustomerRegistrar } from "../../../domain/reg/CustomerRegistrar";
import { StaffRegistrar } from "../../../domain/reg/StaffRegistrar";
import { Customer } from "../../../domain/reg/Customer";
import { Staff } from "../../../domain/reg/Staff";

const run = !!process.env.DATABASE_URL;
const tag = `it-${Date.now()}`;
const email = (n: string) => `${tag}-${n}@example.com`;

describe.skipIf(!run)("PrismaUserRepository + Bcrypt (integration)", () => {
  const repo = new PrismaUserRepository();
  const hasher = new BcryptPasswordHasher(4); // low cost keeps the test fast

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("hasher verifies the right password only", async () => {
    const h = await hasher.hash("password123");
    expect(h).not.toBe("password123");
    expect(await hasher.verify("password123", h)).toBe(true);
    expect(await hasher.verify("wrong", h)).toBe(false);
  });

  it("registers a customer and reads it back as a Customer", async () => {
    const reg = new CustomerRegistrar(repo, hasher);
    await reg.register({ name: "Cu", email: email("c"), password: "password123", address: { lat: 45.5, lng: -73.5 } });
    const found = await repo.findByEmail(email("c"));
    expect(found).toBeInstanceOf(Customer);
    expect((found as Customer).address).toEqual({ lat: 45.5, lng: -73.5 });
  });

  it("round-trips staff with restaurantId", async () => {
    const reg = new StaffRegistrar(repo, hasher);
    await reg.register({ name: "St", email: email("s"), password: "password123", restaurantId: "r1" });
    const found = await repo.findByEmail(email("s"));
    expect(found).toBeInstanceOf(Staff);
    expect((found as Staff).restaurantId).toBe("r1");
  });

  it("rejects a duplicate email", async () => {
    const reg = new CustomerRegistrar(repo, hasher);
    const data = { name: "Du", email: email("d"), password: "password123", address: { lat: 45, lng: -73 } };
    await reg.register(data);
    await expect(reg.register(data)).rejects.toThrow(/already exists/i);
  });

  it("returns null for an unknown email", async () => {
    expect(await repo.findByEmail(email("nobody"))).toBeNull();
  });
});