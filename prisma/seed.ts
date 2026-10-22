import { prisma } from "../src/technical-services/db/prismaClient";
import { BcryptPasswordHasher } from "../src/technical-services/reg/BcryptPasswordHasher";
import { restaurants, menuItems, users } from "./seed-data";

const passwordHasher = new BcryptPasswordHasher();

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
      },
    });
  }
}


//main function to seed the database
async function main() {
  console.log("Starting database seed");

  await seedRestaurants();
  await seedMenuItems();
  await seedUsers();

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