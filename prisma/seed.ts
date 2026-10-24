import { prisma } from "../src/technical-services/db/PrismaClient";
import { BcryptPasswordHasher } from "../src/technical-services/reg/BcryptPasswordHasher";
import { restaurants, menuItems, users } from "./seed-data";

const passwordHasher = new BcryptPasswordHasher();

// Fixed simulator positions. Validate before any seed writes.
function validateCoordinates(lat: number | null | undefined, lng: number | null | undefined, label: string): void {
  if ((lat == null) !== (lng == null)) throw new Error(`${label}: incomplete coordinate pair`);
  if (lat == null || lng == null) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`${label}: invalid coordinates`);
  }
}

// Only fills NULL fields on existing configured records; never resets demo state.
async function backfillLocations() {
  await prisma.$transaction(async (tx) => {
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
      const existing = await tx.user.findUnique({ where: { email: user.email.trim().toLowerCase() } });
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

//seed resturants
async function seedRestaurants() {
  for (const restaurant of restaurants) {
    await prisma.restaurant.upsert({
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

//seed menu items
async function seedMenuItems() {
  for (const item of menuItems) {
    const existingItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: item.restaurantId,
        name: item.name,
      },
    });

    if (existingItems.length > 1) {
      throw new Error(
        `Multiple menu items found for ${item.name} in restaurant ${item.restaurantId}`,
      );
    }

    const existingItem = existingItems[0];

    if (existingItem) {
      await prisma.menuItem.update({
        where: { id: existingItem.id },
        data: {
          description: item.description,
          imageUrl: item.imageUrl,
          priceCents: item.priceCents,
          available: item.available,
        },
      });
    } else {
      await prisma.menuItem.create({
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

//seed users
async function seedUsers() {
  for (const user of users) {
    const normalizedEmail = user.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      continue;
    }

    const passwordHash = await passwordHasher.hash(user.password);

    await prisma.user.create({
      data: {
        name: user.name,
        email: normalizedEmail,
        passwordHash,
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


//main function to seed the database
async function main() {
  for (const restaurant of restaurants) validateCoordinates(restaurant.lat, restaurant.lng, "Restaurant configuration");
  for (const user of users) {
    if (user.role === "COURIER") validateCoordinates(user.courierLat, user.courierLng, "Courier configuration");
    if (user.role === "CUSTOMER") validateCoordinates(user.deliveryLat, user.deliveryLng, "Customer configuration");
  }
  const locationsOnly = process.argv.includes("--locations-only");
  if (locationsOnly) {
    await backfillLocations();
    console.log("Initial location backfill completed (existing records only).");
    return;
  }
  console.log("Starting database seed");

  await seedRestaurants();
  await seedMenuItems();
  await seedUsers();
  await backfillLocations();

  console.log("Database seed completed.");
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });