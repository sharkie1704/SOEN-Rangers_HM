
import "./button-interactions.css";

type RestaurantCardData = {
  name: string;
  category: string;
  image: string;
  status: "open" | "paused" | "closed";
  onViewMenu: () => void;
};

export default function RestaurantCard({ name, category,status,image,onViewMenu
}: RestaurantCardData) {
  return (

    <article
      style={{
        backgroundColor: "#EADBC8",
        border: "1px solid #C89F7A",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >

      {/* Show the restaurant image */}
      <img
        src={image}
        alt={name}
        style={{
          width: "100%",
          height: "180px",
          objectFit: "cover",
        }}
      />
      {/* Restaurant name */}
      <div style={{ padding: "20px" }}>
        <h2
          style={{
            color: "#4B3028",
            margin: "0 0 8px",
          }}
        >
          {name}
        </h2>
        
        {/* Restaurant category */}
        <p
          style={{
            color: "#4B3028",
            margin: 0,
          }}
        >
          {category}
        </p>

        {/* Status  */}
         <span
        style={{
            display: "inline-block",
            marginTop: "12px",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 600,
            backgroundColor:
            status === "open"
                ? "#DCEEDC"
                : status === "paused"
                ? "#FFF0CD"
                : "#F2D8D5",
            color:
            status === "open"
                ? "#28633A"
                : status === "paused"
                ? "#835900"
                : "#923C32",
        }}
        >
        {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>

        {/* Open the restaurant's menu */}
        <button
        type="button"
        className="interactive-button"
        onClick={onViewMenu}
        style={{
            display: "block",
            marginTop: "16px",
            padding: "10px 18px",
            backgroundColor: "#C66B32",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            fontFamily: "inherit",
            fontWeight: 600,
            cursor: "pointer",
        }}
        >
        View Menu →
        </button>
      </div>
    </article>
  );
}
