export const RESTAURANT_IDS = {
  DEMO_BAKERY: "11111111-1111-4111-8111-111111111111",
  SWEET_SPOT: "22222222-2222-4222-8222-222222222222",
} as const;

export const restaurants = [
  {
    id: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Demo Bakery",
    category: "Desserts",
    description: "A bakery serving cakes, cookies, and other sweet treats.",
    imageUrl: "https://example.com/demo-bakery.jpg",
    status: "OPEN",
  },
  {
    id: RESTAURANT_IDS.SWEET_SPOT,
    name: "Sweet Spot",
    category: "Desserts",
    description: "A dessert shop offering pastries and specialty sweets.",
    imageUrl: "https://example.com/sweet-spot.jpg",
    status: "OPEN",
  },
] as const;

export const menuItems = [
  {
    restaurantId: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Chocolate Brownie",
    description: "Rich chocolate brownie.",
    imageUrl: "https://example.com/chocolate-brownie.jpg",
    priceCents: 450,
    available: true,
  },
  {
    restaurantId: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Chocolate Chip Cookie",
    description: "Fresh baked chocolate chip cookie.",
    imageUrl: "https://example.com/chocolate-chip-cookie.jpg",
    priceCents: 300,
    available: true,
  },
  {
    restaurantId: RESTAURANT_IDS.SWEET_SPOT,
    name: "Strawberry Cheesecake",
    description: "Creamy cheesecake topped with strawberries.",
    imageUrl: "https://example.com/strawberry-cheesecake.jpg",
    priceCents: 700,
    available: true,
  },
  {
    restaurantId: RESTAURANT_IDS.SWEET_SPOT,
    name: "Tiramisu",
    description: "Classic coffee-flavoured Italian dessert.",
    imageUrl: "https://example.com/tiramisu.jpg",
    priceCents: 750,
    available: true,
  },
] as const;

export const users = [
  {
    name: "Demo Customer",
    email: "customer@dessertdash.test",
    password: "Demo123!",
    role: "CUSTOMER",
    deliveryLat: 45.5017,
    deliveryLng: -73.5673,
  },
  {
    name: "Demo Restaurant Staff",
    email: "staff@dessertdash.test",
    password: "Demo123!",
    role: "RESTAURANT",
    restaurantId: RESTAURANT_IDS.DEMO_BAKERY,
  },
  {
    name: "Demo Courier",
    email: "courier@dessertdash.test",
    password: "Demo123!",
    role: "COURIER",
  },
  {
    name: "Demo Operator",
    email: "operator@dessertdash.test",
    password: "Demo123!",
    role: "OPERATOR",
  },
] as const;
