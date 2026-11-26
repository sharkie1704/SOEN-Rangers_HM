const restaurantRatingUpdates = new EventTarget();
const updateEventName = "restaurant-rating-updated";

export function publishRestaurantRatingUpdate(restaurantId: string): void {
  restaurantRatingUpdates.dispatchEvent(new CustomEvent(updateEventName, { detail: { restaurantId } }));
}

export function subscribeToRestaurantRatingUpdates(
  restaurantId: string,
  refresh: () => void,
): () => void {
  const listener = (event: Event) => {
    if ((event as CustomEvent<{ restaurantId: string }>).detail?.restaurantId === restaurantId) refresh();
  };
  restaurantRatingUpdates.addEventListener(updateEventName, listener);
  return () => restaurantRatingUpdates.removeEventListener(updateEventName, listener);
}
