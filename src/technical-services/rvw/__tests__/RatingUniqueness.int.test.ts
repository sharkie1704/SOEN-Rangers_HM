import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";

const testUrl = process.env.TEST_DATABASE_URL;
const run = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1" && Boolean(testUrl);

it.skipIf(!run)("PostgreSQL rejects a second rating for the same order", async () => {
  const url = new URL(testUrl!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || [...url.searchParams.keys()].some((key) => key !== "sslmode")) {
    throw new Error("The rating integration test requires a disposable local PostgreSQL database.");
  }

  const db = new Client({ connectionString: url.href });
  const id = randomUUID();
  const courier = `${id}-courier`;
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query(`
      INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "courierStatus")
      VALUES ($1, $3, 'Test customer', 'unused', 'CUSTOMER', NULL),
             ($2, $4, 'Test courier', 'unused', 'COURIER', 'OFFLINE')
    `, [id, courier, `${id}@example.test`, `${courier}@example.test`]);
    await db.query(`
      INSERT INTO "Restaurant" ("id", "name", "category", "description", "imageUrl")
      VALUES ($1, 'Test restaurant', 'Desserts', '', '')
    `, [id]);
    const { rows: [order] } = await db.query<{ id: number }>(`
      INSERT INTO "Order" ("customerId", "restaurantId", "status", "placedAt")
      VALUES ($1, $1, 'DELIVERED', NOW()) RETURNING "id"
    `, [id]);
    const insert = `
      INSERT INTO "Rating" ("orderId", "customerId", "restaurantId", "courierId", "restaurantScore", "courierScore")
      VALUES ($1, $2, $2, $3, $4, $5)
    `;
    await db.query(insert, [order.id, id, courier, 1, 5]);
    await expect(db.query(insert, [order.id, id, courier, 5, 1])).rejects.toMatchObject({
      code: "23505", constraint: "Rating_pkey",
    });
  } finally {
    await db.query("ROLLBACK").finally(() => db.end());
  }
});
