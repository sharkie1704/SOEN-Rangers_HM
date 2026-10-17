
import RestaurantCard from "./RestaurantCard";

const restaurants = [
  {
    id: 1,
    name: "Sweet Dreams",
    category: "Cakes & Pastries",
     status: "closed",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=85",
  },
  {
    id: 2,
    name: "Chocolate Heaven",
    category: "Chocolate & Waffles",
    status: "open",
    image: "https://images.unsplash.com/photo-1641864624167-25c921ee00e9?w=800&auto=format&fit=crop&q=85",
  },
  {
    id: 3,
    name: "La Petite Pâtisserie",
    category: "French Desserts",
     status: "paused",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=85",
  },
  {
    id: 4,
    name: "Sugar Rush",
    category: "Ice Cream & Sweets",
     status: "open",
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&auto=format&fit=crop&q=85",
  },
];

export default function RestaurantListPage() {
  return (
    <main
      style={{
        backgroundColor: "#FFF9F2",
        minHeight: "100vh",
        padding: "40px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <h1 style={{ color: "#4B3028", textAlign: "center",marginBottom: "16px" }}>
         Discover the best sweet treats in Montréal
      </h1>

      <p style={{ color: "#4B3028", textAlign: "center"  }}>
         Craving something sweet? Discover local dessert spots and find your next favourite treat
      </p>

      <section
        aria-label="Restaurants"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          gap: "24px",
          marginTop: "48px",
        }}
      >
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            name={restaurant.name}
            category={restaurant.category}
            status={restaurant.status as "open" | "paused" | "closed"}
            image={restaurant.image}
          />
        ))}
      </section>
    </main>
  );
}
