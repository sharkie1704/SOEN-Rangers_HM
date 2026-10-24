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
] as const;
