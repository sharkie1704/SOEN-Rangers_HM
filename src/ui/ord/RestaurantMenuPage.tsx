import MenuItemCard from "./MenuItemCard";



// Temporary menu items for the page layout
const menuItems = [
  {
    id: 1,
    name: "Strawberry Shortcake",
    description: "Vanilla cake with fresh cream and strawberries.",
    price: 8.5,
    image: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=800&auto=format&fit=crop&q=85",
  },
  {
    id: 2,
    name: "Chocolate Brownie",
    description: "Rich chocolate brownie with a soft, fudgy centre.",
    price: 6.75,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=85",
  },
  {
    id: 3,
    name: "Classic Cheesecake",
    description: "Creamy cheesecake with a buttery biscuit crust.",
    price: 7.95,
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=85",
  },
];

type RestaurantMenuPageInputs = {
  restaurantId: number;
  onBack: () => void;
};

export default function RestaurantMenuPage({
  restaurantId, onBack,
}: RestaurantMenuPageInputs) {
  return (
    <main
      style={{
        backgroundColor: "#FFF9F2",
        minHeight: "100vh",
        padding: "40px 24px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Back navigation */}
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#C66B32",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
            marginBottom: "32px",
            padding: 0,
          }}
        >
          ← Back to restaurants
        </button>

        {/* Restaurant heading */}
        <header
          style={{
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          <h1
            style={{
              color: "#4B3028",
              fontSize: "32px",
              lineHeight: 1.2,
              margin: "0 0 16px",
            }}
          >
            Menu for restaurant {restaurantId}
          </h1>

          <p style={{ color: "#4B3028", fontSize: "16px" }}>
            Take a look at our sweet selection.
          </p>
        </header>

        {/* Menu section */}
        <section aria-labelledby="menu-heading">
          <h2
            id="menu-heading"
            style={{
              color: "#4B3028",
              fontSize: "28px",
              marginBottom: "24px",
            }}
          >
            Our Menu
          </h2>

          {/* Menu item cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
              gap: "24px",
            }}
          >
            {menuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                image={item.image}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
