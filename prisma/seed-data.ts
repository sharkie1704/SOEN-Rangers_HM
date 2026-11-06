export const RESTAURANT_IDS = {
  DEMO_BAKERY: "11111111-1111-4111-8111-111111111111",
  SWEET_SPOT: "22222222-2222-4222-8222-222222222222",
  MAPLE_SWEETS: "33333333-3333-4333-8333-333333333333", // ADDED: paused-restaurant scenario
} as const;

export const restaurants = [
  {
    id: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Demo Bakery",
    category: "Desserts",
    description: "A bakery serving cakes, cookies, and other sweet treats.",
    imageUrl: "https://png.pngtree.com/background/20230518/original/pngtree-bakery-with-many-different-types-of-items-behind-glass-picture-image_2645229.jpg",
    status: "OPEN",
    lat: 45.4973,
    lng: -73.5789,
  },
  {
    id: RESTAURANT_IDS.SWEET_SPOT,
    name: "Sweet Spot",
    category: "Desserts",
    description: "A dessert shop offering pastries and specialty sweets.",
    imageUrl: "https://www.pjponline.com/wp-content/uploads/2019/02/shutterstock_475360618-scaled.jpg",
    status: "OPEN",
    lat: 45.5131,
    lng: -73.5683,
  },
  
  {
    id: RESTAURANT_IDS.MAPLE_SWEETS,
    name: "Maple Sweets",
    category: "Desserts",
    description: "A maple-themed dessert counter, currently paused.",
    imageUrl: "", // TODO: replace with a real image
    status: "PAUSED",
    lat: 45.5230,
    lng: -73.5990,
  },
] as const;

export const menuItems = [
  {
    restaurantId: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Chocolate Brownie",
    description: "Rich chocolate brownie.",
    imageUrl: "https://th.bing.com/th/id/R.2512148a2154af1895b9383a5a12bca6?rik=eCu3G1nX3JmQCg&riu=http%3a%2f%2fwww.myrecipeingredients.com%2fwp-content%2fuploads%2f2025%2f04%2f3a9u0F4.jpg&ehk=EpvcKkfJmDZ3U3qBbPc2tswIMW4ycKJ3SC%2fIbqKlPHM%3d&risl=&pid=ImgRaw&r=0",
    priceCents: 450,
    available: true,
  },
  {
    restaurantId: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Chocolate Chip Cookie",
    description: "Fresh baked chocolate chip cookie.",
    imageUrl: "https://tse1.mm.bing.net/th/id/OIP.DvtMOyIlvS9WIwvBA_EI2AHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    priceCents: 300,
    available: true,
  },
  {
    restaurantId: RESTAURANT_IDS.SWEET_SPOT,
    name: "Strawberry Cheesecake",
    description: "Creamy cheesecake topped with strawberries.",
    imageUrl: "https://www.elmundoeats.com/wp-content/uploads/2024/06/A-portion-of-no-bake-strawberry-cheesecake.jpg",
    priceCents: 700,
    available: true,
  },
  {
    restaurantId: RESTAURANT_IDS.SWEET_SPOT,
    name: "Tiramisu",
    description: "Classic coffee-flavoured Italian dessert.",
    imageUrl: "https://tse3.mm.bing.net/th/id/OIP.dij71rEN7SZvctEJJQ82EgHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    priceCents: 750,
    available: true,
  },
  // ADDED: sold-out item (R-DASH-04: Place Order disabled when every selected item is sold out)
  {
    restaurantId: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Lemon Tart",
    description: "Tangy lemon tart. Currently sold out.",
    imageUrl: "", // TODO: replace
    priceCents: 500,
    available: false,
  },
  // ADDED: cheap item to trigger the small-order surcharge (PRC pricing check)
  {
    restaurantId: RESTAURANT_IDS.DEMO_BAKERY,
    name: "Vanilla Macaron",
    description: "Light vanilla macaron.",
    imageUrl: "", // TODO: replace
    priceCents: 250,
    available: true,
  },
  // ADDED: a larger item so an order can land above the surcharge threshold
  {
    restaurantId: RESTAURANT_IDS.SWEET_SPOT,
    name: "Cannoli",
    description: "Crisp shell filled with sweet ricotta cream.",
    imageUrl: "", // TODO: replace
    priceCents: 400,
    available: true,
  },
  // ADDED: menu for the paused restaurant (items are available, the restaurant is not)
  {
    restaurantId: RESTAURANT_IDS.MAPLE_SWEETS,
    name: "Maple Fudge",
    description: "Soft maple fudge squares.",
    imageUrl: "", // TODO: replace
    priceCents: 350,
    available: true,
  },
  {
    restaurantId: RESTAURANT_IDS.MAPLE_SWEETS,
    name: "Maple Cream Donut",
    description: "Donut filled with maple cream.",
    imageUrl: "", // TODO: replace
    priceCents: 400,
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
    courierLat: 45.5017,
    courierLng: -73.5673,
    courierStatus: "OFFLINE",
  },
  {
    name: "Demo Operator",
    email: "operator@dessertdash.test",
    password: "Demo123!",
    role: "OPERATOR",
  },
  {
    name: "Sweet Spot Staff",
    email: "staff2@dessertdash.test",
    password: "Demo123!",
    role: "RESTAURANT",
    restaurantId: RESTAURANT_IDS.SWEET_SPOT,
  },
  {
    name: "Maple Sweets Staff",
    email: "staff3@dessertdash.test",
    password: "Demo123!",
    role: "RESTAURANT",
    restaurantId: RESTAURANT_IDS.MAPLE_SWEETS,
  },
  {
    name: "Demo Courier 2",
    email: "courier2@dessertdash.test",
    password: "Demo123!",
    role: "COURIER",
    courierLat: 45.4990, // close to Demo Bakery
    courierLng: -73.5760,
    courierStatus: "OFFLINE",
  },
  {
    name: "Demo Courier 3",
    email: "courier3@dessertdash.test",
    password: "Demo123!",
    role: "COURIER",
    courierLat: 45.5017, // same spot as Demo Courier: exact distance tie, lowest id wins
    courierLng: -73.5673,
    courierStatus: "OFFLINE",
  },
  {
    name: "Demo Courier 4",
    email: "courier4@dessertdash.test",
    password: "Demo123!",
    role: "COURIER",
    courierLat: 45.5125, // close to Sweet Spot
    courierLng: -73.5690,
    courierStatus: "OFFLINE",
  },
  {
    name: "Demo Customer 2",
    email: "customer2@dessertdash.test",
    password: "Demo123!",
    role: "CUSTOMER",
    deliveryLat: 45.5050,
    deliveryLng: -73.5700,
  },
  {
    name: "Demo Customer 3",
    email: "customer3@dessertdash.test",
    password: "Demo123!",
    role: "CUSTOMER",
    deliveryLat: 45.4950,
    deliveryLng: -73.5750,
  },
  {
    name: "Demo Customer 4",
    email: "customer4@dessertdash.test",
    password: "Demo123!",
    role: "CUSTOMER",
    deliveryLat: 45.5100,
    deliveryLng: -73.5600,
  },
  {
    name: "Demo Customer 5",
    email: "customer5@dessertdash.test",
    password: "Demo123!",
    role: "CUSTOMER",
    deliveryLat: 45.5000,
    deliveryLng: -73.5850,
  },
  {
    name: "Demo Customer 6",
    email: "customer6@dessertdash.test",
    password: "Demo123!",
    role: "CUSTOMER",
    deliveryLat: 45.5180,
    deliveryLng: -73.5720,
  },
] as const;