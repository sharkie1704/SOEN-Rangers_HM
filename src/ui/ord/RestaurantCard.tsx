
type RestaurantCardData = {
  name: string;
  category: string;
  image: string;
  status: "open" | "paused" | "closed";
};

export default function RestaurantCard({ name, category,status,image,
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
      <img
        src={image}
        alt={name}
        style={{
          width: "100%",
          height: "180px",
          objectFit: "cover",
        }}
      />

      <div style={{ padding: "20px" }}>
        <h2
          style={{
            color: "#4B3028",
            margin: "0 0 8px",
          }}
        >
          {name}
        </h2>

        <p
          style={{
            color: "#4B3028",
            margin: 0,
          }}
        >
          {category}
        </p>

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
      </div>
    </article>
  );
}
