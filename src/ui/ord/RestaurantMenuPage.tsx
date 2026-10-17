type RestaurantMenuPageInputs = {
  restaurantId: number;
  onBack: () => void;
};

export default function RestaurantMenuPage({
  restaurantId,
  onBack,
}: RestaurantMenuPageInputs) {
  return (
    <main>
      <button onClick={onBack}>Back to restaurants</button>

      <h1>Menu for restaurant {restaurantId}</h1>
      <p>Menu items coming soon.</p>
    </main>
  );
}