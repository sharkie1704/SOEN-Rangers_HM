
import "./button-interactions.css";

const restaurantImageFallback = "/restaurant-placeholder.svg";

type RestaurantCardData = {
  name: string;
  category: string;
  address: string;
  specialty: string;
  rating?: number;
  image: string;
  status: "open" | "paused" | "closed";
  onViewMenu: () => void;
};

export default function RestaurantCard({ name, category, address, specialty, rating, status, image, onViewMenu
}: RestaurantCardData) {
  return (

    <article
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: "#EADBC8",
        border: "1px solid #C89F7A",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >

      {/* Show the restaurant image */}
      <img
        src={image.trim() ? image : restaurantImageFallback}
        alt={name}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = restaurantImageFallback;
        }}
        style={{
          width: "100%",
          height: "180px",
          flexShrink: 0,
          objectFit: "cover",
        }}
      />
      {/* Restaurant name */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "20px" }}>
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

        <div style={{ marginTop: "14px", color: "#4B3028", fontSize: "14px", lineHeight: 1.5 }}>
          <p style={{ margin: "0 0 6px" }}>{specialty}</p>
          <p style={{ margin: "0 0 6px" }}>{address}</p>
          {rating !== undefined && (
            <p aria-label={`Rated ${rating} out of 5`} style={{ margin: 0, color: "#835900", fontWeight: 600 }}>
              <span aria-hidden="true">★</span> {rating.toFixed(1)}
            </p>
          )}
        </div>

        {/* Status  */}
         <span
        style={{
            alignSelf: "flex-start",
            display: "inline-block",
            marginTop: "12px",
            marginBottom: "12px",
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

        {/* Open the restaurant's menu; only open restaurants can be browsed (R-ORD-02) */}
        <button
        type="button"
        className="interactive-button"
        onClick={onViewMenu}
        disabled={status !== "open"}
        style={{
            alignSelf: "flex-start",
            display: "block",
            marginTop: "auto",
            padding: "10px 18px",
            backgroundColor: status === "open" ? "#C66B32" : "#BCA99B",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            fontFamily: "inherit",
            fontWeight: 600,
            cursor: status === "open" ? "pointer" : "not-allowed",
        }}
        >
        {status === "open" ? "View Menu →" : "Menu unavailable"}
        </button>
      </div>
    </article>
  );
}
