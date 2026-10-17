import "./button-interactions.css";

type MenuItemCardData = {
  id: number;
  name: string;
  description: string;
  price: number;
  available:boolean;
  image: string;
  onAddToCart: () => void;
};

export default function MenuItemCard({name, description, price, image, available, onAddToCart
}: MenuItemCardData) {
  return (
    <article
      style={{
        backgroundColor: "#EADBC8",
        border: "1px solid #C89F7A",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <img
        src={image}
        alt={name}
        style={{
          width: "100%",
          height: "200px",
          objectFit: "cover",
          display: "block",
        }}
      />

      <div style={{ padding: "20px" }}>
        <h3
          style={{
            color: "#4B3028",
            margin: "0 0 10px",
            fontSize: "21px",
          }}
        >
          {name}
        </h3>

        <p
          style={{
            color: "#4B3028",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        <p
          style={{
            color: "#4B3028",
            fontSize: "18px",
            fontWeight: 600,
            marginBottom: 0,
          }}
        >
          ${price.toFixed(2)}
        </p>

        
    <span
      style={{
        display: "inline-block",
        marginTop: "12px",
        padding: "6px 12px",
        borderRadius: "20px",
        fontSize: "13px",
        fontWeight: 600,
        backgroundColor: available ? "#DCEEDC" : "#F2D8D5",
        color: available ? "#28633A" : "#923C32",
      }}
    >
      {available ? "Available" : "Sold out"}
    </span>

      <button
    type="button"
    className="interactive-button"
    disabled={!available}
    onClick={onAddToCart}
    style={{
      display: "block",
      width: "100%",
      marginTop: "16px",
      padding: "10px 16px",
      backgroundColor: available ? "#C66B32" : "#BCA99B",
      color: "#FFFFFF",
      border: "none",
      borderRadius: "8px",
      fontFamily: "inherit",
      fontWeight: 600,
      cursor: available ? "pointer" : "not-allowed",
    }}
  >
    {available ? "Add to Cart" : "Unavailable"}
  </button>

      </div>
    </article>
  );
}
