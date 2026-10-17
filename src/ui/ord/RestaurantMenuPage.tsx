import MenuItemCard from "./MenuItemCard";


type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  available:boolean;
  image: string;

};

// Temporary menu items for the page layout
const menus : Record<number, MenuItem[]>  = {
   1: [
    {
      id: 101,
      name: "Strawberry Shortcake",
      description: "Vanilla cake with fresh cream and strawberries.",
      price: 8.50,
      available:true,
      image: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 102,
      name: "Chocolate Brownie",
      description: "Rich chocolate brownie with a fudgy centre.",
      price: 6.75,
      available:false,
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=85",
    },
  ],
  2: [
    {
      id: 201,
      name: "Chocolate Lava Cake",
      description: "Warm chocolate cake with a molten centre.",
      price: 9.25,
      available:true,
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 202,
      name: "Fudge Brownie",
      description: "A rich brownie for chocolate lovers.",
      price: 7.00,
      available:false,
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=85",
    },
  ],
  3: [
    {
      id: 301,
      name: "French Macarons",
      description: "Delicate macarons in assorted flavours.",
      price: 8.95,
      available:true,
      image: "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 302,
      name: "Classic Cheesecake",
      description: "Creamy cheesecake with a biscuit crust.",
      price: 7.95,
      available:false,
      image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=85",
    },
  ],
  4: [
    {
      id: 401,
      name: "Ice Cream Sundae",
      description: "Vanilla ice cream with chocolate sauce.",
      price: 7.50,
      available:true,
      image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=85",
    },
    {
      id: 402,
      name: "Chocolate Chip Cookies",
      description: "Soft cookies with chocolate chips.",
      price: 5.50,
      available:false,
      image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=85",
    },
  ],
};

type RestaurantMenuPageInputs = {
  restaurantId: number;
  onBack: () => void;
};

export default function RestaurantMenuPage({
  restaurantId, onBack,
}: RestaurantMenuPageInputs) {
const menuItems = menus[restaurantId] ?? [];


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
                "repeat(auto-fill, minmax(min(100%, 250px), 1fr))",
              gap: "24px",
               maxWidth: "900px",
            }}
          >
            {menuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                available={item.available}
                image={item.image}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
