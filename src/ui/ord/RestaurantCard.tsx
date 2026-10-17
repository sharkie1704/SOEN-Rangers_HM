
type RestaurantCardData = {
  name: string;
  category: string;
  image: string;
};

export default function RestaurantCard({ name, category,image,
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
      </div>
    </article>
  );
}
