export type OrderActor =
  | { readonly userId: number; readonly role: "customer" }
  | { readonly userId: number; readonly role: "restaurant"; readonly restaurantId: number };
