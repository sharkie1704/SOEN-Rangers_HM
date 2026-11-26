export type RestaurantDemoDetails = {
  address: string;
  specialty: string;
};

// Presentation details complement the restaurant summaries stored in the database.
const detailsByRestaurantId: Record<string, RestaurantDemoDetails> = {
  "11111111-1111-4111-8111-111111111111": {
    address: "42 Rue des Pâtisseries, Montréal, QC",
    specialty: "Bakery · cakes, brownies & cookies",
  },
  "22222222-2222-4222-8222-222222222222": {
    address: "18 Avenue des Gourmandises, Montréal, QC",
    specialty: "Cheesecake & classic Italian desserts",
  },
  "33333333-3333-4333-8333-333333333333": {
    address: "75 Rue du Sirop d'érable, Montréal, QC",
    specialty: "Maple pastries, fudge & cream-filled treats",
  },
  "44444444-4444-4444-8444-444444444444": {
    address: "231 Rue Saint-Viateur, Montréal, QC",
    specialty: "Fresh pastries, cookies & seasonal treats",
  },
  "55555555-5555-4555-8555-555555555555": {
    address: "88 Avenue du Parc, Montréal, QC",
    specialty: "Small-batch ice cream & frozen desserts",
  },
  "66666666-6666-4666-8666-666666666666": {
    address: "510 Rue Saint-Laurent, Montréal, QC",
    specialty: "Brownies, blondies & layered sweets",
  },
  "77777777-7777-4777-8777-777777777777": {
    address: "1420 Boulevard René-Lévesque, Montréal, QC",
    specialty: "Celebration cakes & fresh cheesecake",
  },
};

export function getRestaurantDemoDetails(restaurantId: string): RestaurantDemoDetails | undefined {
  return detailsByRestaurantId[restaurantId];
}
