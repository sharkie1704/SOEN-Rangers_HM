

type MenuItemCardData = {
  name: string;
  description: string;
  price: number;
  image: string;
};

export default function MenuItemCard({name, description, price, image,
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
      </div>
    </article>
  );
}
