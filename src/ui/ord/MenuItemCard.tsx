import "./button-interactions.css";
import "./menu-item-card.css";

const menuItemImageFallback = "/menu-item-placeholder.svg";

type MenuItemCardData = {
  id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
  image: string;
  onAddToCart: () => void;
};

export default function MenuItemCard({
  name, description, price, image, available, onAddToCart,
}: MenuItemCardData) {
  return (
    <article className={`menu-item-card${available ? "" : " menu-item-card--sold-out"}`}>
      <img
        className="menu-item-card__image"
        src={image.trim() ? image : menuItemImageFallback}
        alt={name}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = menuItemImageFallback;
        }}
      />
      <div className="menu-item-card__content">
        <h3>{name}</h3>
        <p className="menu-item-card__description">{description}</p>
        <p className="menu-item-card__price">${price.toFixed(2)}</p>
        <span className={`menu-item-card__availability menu-item-card__availability--${available ? "available" : "sold-out"}`}>
          {available ? "Available" : "Sold out"}
        </span>
        <button
          type="button"
          className="interactive-button menu-item-card__action"
          disabled={!available}
          onClick={onAddToCart}
        >
          {available ? "Add to Cart" : "Unavailable"}
        </button>
      </div>
    </article>
  );
}
