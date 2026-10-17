// routes

import { useState } from "react";
import RestaurantListPage from "./ord/RestaurantListPage";
import RestaurantMenuPage from "./ord/RestaurantMenuPage";

export default function App() {

  const [selectedRestaurantId, setSelectedRestaurantId] =
    useState<number | null>(null);

  //navigate to the selected menu page 
  if (selectedRestaurantId !== null) {
  return (
    <RestaurantMenuPage
      restaurantId={selectedRestaurantId}
      onBack={() => setSelectedRestaurantId(null)}
    />
  );
}
  return (
      <RestaurantListPage
        onSelectRestaurant={setSelectedRestaurantId}
      />
    );
}

