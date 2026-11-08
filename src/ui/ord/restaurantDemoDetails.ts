export type RestaurantDemoDetails = {
  address: string;
  specialty: string;
  rating: number;
};

// Temporary fictional presentation data until restaurant details and reviews
// are served by the backend.
const detailsByRestaurantId: Record<string, RestaurantDemoDetails> = {
  "11111111-1111-4111-8111-111111111111": {
    address: "42 Rue des Pâtisseries, Montréal, QC",
    specialty: "Bakery · cakes, brownies & cookies",
    rating: 4.8,
  },
  "22222222-2222-4222-8222-222222222222": {
    address: "18 Avenue des Gourmandises, Montréal, QC",
    specialty: "Cheesecake & classic Italian desserts",
    rating: 4.6,
  },
  "33333333-3333-4333-8333-333333333333": {
    address: "75 Rue du Sirop d'Érable, Montréal, QC",
    specialty: "Maple pastries, fudge & cream-filled treats",
    rating: 4.7,
  },
};

export function getRestaurantDemoDetails(restaurantId: string): RestaurantDemoDetails | undefined {
  return detailsByRestaurantId[restaurantId];
}
