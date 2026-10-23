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
};

export function getRestaurantDemoDetails(restaurantId: string): RestaurantDemoDetails | undefined {
  return detailsByRestaurantId[restaurantId];
}
