import { prisma } from "./PrismaClient";
import { BcryptPasswordHasher } from "../reg/BcryptPasswordHasher";
import { restaurants, menuItems, users } from "../../../prisma/seed-data";
import { loadPricingConfig, PRICING_SETTINGS_ID } from "../../../prisma/pricing-config";

export type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const passwordHasher = new BcryptPasswordHasher();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

function validateCoordinates(lat: number | null | undefined, lng: number | null | undefined, label: string): void {
  if ((lat == null) !== (lng == null)) throw new Error(`${label}: incomplete coordinate pair`);
  if (lat == null || lng == null) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`${label}: invalid coordinates`);
  }
}

export function validateSeedData(): void {
  for (const r of restaurants) validateCoordinates(r.lat, r.lng, "Restaurant configuration");
  for (const u of users) {
    if (u.role === "COURIER") validateCoordinates(u.courierLat, u.courierLng, "Courier configuration");
    if (u.role === "CUSTOMER") validateCoordinates(u.deliveryLat, u.deliveryLng, "Customer configuration");
  }
}

export interface PreparedSeed {
  pricing: Awaited<ReturnType<typeof loadPricingConfig>>;
  passwordHashes: Map<string, string>;
}


export async function prepareSeed(): Promise<PreparedSeed> {
  validateSeedData();
  const pricing = await loadPricingConfig();
  const passwordHashes = new Map<string, string>();
  for (const u of users) {
    passwordHashes.set(normalizeEmail(u.email), await passwordHasher.hash(u.password));
  }
  return { pricing, passwordHashes };
}

async function seedRestaurants(db: DbClient) {
  for (const restaurant of restaurants) {
    await db.restaurant.upsert({
      where: { id: restaurant.id },
      update: {
        name: restaurant.name,
        category: restaurant.category,
        description: restaurant.description,
        imageUrl: restaurant.imageUrl,
        status: restaurant.status,
      },
      create: {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        description: restaurant.description,
        imageUrl: restaurant.imageUrl,
        status: restaurant.status,
        lat: restaurant.lat,
        lng: restaurant.lng,
      },
    });
  }
}

async function seedMenuItems(db: DbClient) {
  for (const item of menuItems) {
    const existingItems = await db.menuItem.findMany({
      where: { restaurantId: item.restaurantId, name: item.name },
    });
    if (existingItems.length > 1) {
      throw new Error(`Multiple menu items found for ${item.name} in restaurant ${item.restaurantId}`);
    }
    const existingItem = existingItems[0];
    if (existingItem) {
      await db.menuItem.update({
        where: { id: existingItem.id },
        data: {
          description: item.description,
          imageUrl: item.imageUrl,
          priceCents: item.priceCents,
          available: item.available,
        },
      });
    } else {
      await db.menuItem.create({
        data: {
          restaurantId: item.restaurantId,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          priceCents: item.priceCents,
          available: item.available,
        },
      });
    }
  }
}

async function seedUsers(db: DbClient, passwordHashes: Map<string, string>) {
  for (const user of users) {
    const email = normalizeEmail(user.email);
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) continue;

    const fixedId = "id" in user && typeof user.id === "string" ? user.id : undefined;
    await db.user.create({
      data: {
        id: fixedId, // for fixed ids, if provided
        name: user.name,
        email,
        passwordHash: passwordHashes.get(email)!,
        role: user.role,
        deliveryLat: "deliveryLat" in user ? user.deliveryLat : null,
        deliveryLng: "deliveryLng" in user ? user.deliveryLng : null,
        restaurantId: "restaurantId" in user ? user.restaurantId : null,
        ...(user.role === "COURIER" ? {
          courierLat: user.courierLat,
          courierLng: user.courierLng,
          courierStatus: user.courierStatus,
        } : {}),
      },
    });
  }
}

export async function seedDatabase(db: DbClient, prepared: PreparedSeed): Promise<void> {
  await db.pricingSettings.upsert({
    where: { id: PRICING_SETTINGS_ID },
    update: prepared.pricing,
    create: { id: PRICING_SETTINGS_ID, ...prepared.pricing },
  });
  await seedRestaurants(db);
  await seedMenuItems(db);
  await seedUsers(db, prepared.passwordHashes);
}

// CLI-only helper (needs $transaction, so it takes the full client). reset does not use it.
export async function backfillLocations(client: typeof prisma): Promise<void> {
  await client.$transaction(async (tx) => {
    for (const restaurant of restaurants) {
      const existing = await tx.restaurant.findUnique({ where: { id: restaurant.id } });
      if (!existing) continue;
      const lat = existing.lat ?? restaurant.lat;
      const lng = existing.lng ?? restaurant.lng;
      validateCoordinates(lat, lng, "Restaurant");
      await tx.restaurant.updateMany({ where: { id: existing.id, lat: null }, data: { lat } });
      await tx.restaurant.updateMany({ where: { id: existing.id, lng: null }, data: { lng } });
    }
    for (const user of users) {
      if (user.role !== "COURIER") continue;
      const existing = await tx.user.findUnique({ where: { email: normalizeEmail(user.email) } });
      if (!existing || existing.role !== "COURIER") continue;
      const courierLat = existing.courierLat ?? user.courierLat;
      const courierLng = existing.courierLng ?? user.courierLng;
      validateCoordinates(courierLat, courierLng, "Courier");
      await tx.user.updateMany({ where: { id: existing.id, role: "COURIER", courierLat: null }, data: { courierLat } });
      await tx.user.updateMany({ where: { id: existing.id, role: "COURIER", courierLng: null }, data: { courierLng } });
      await tx.user.updateMany({
        where: { id: existing.id, role: "COURIER", courierStatus: null },
        data: { courierStatus: user.courierStatus },
      });
    }
  });
}