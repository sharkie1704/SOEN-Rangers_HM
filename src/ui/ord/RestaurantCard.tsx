import "./button-interactions.css";
import "./restaurant-card.css";

const restaurantImageFallback = "/restaurant-placeholder.svg";

type RestaurantCardData = {
  name: string;
  category: string;
  address: string;
  specialty: string;
  rating?: number;
  ratingCount?: number;
  image: string;
  status: "open" | "paused" | "closed";
  actionLabel?: string;
  onViewMenu: () => void;
};

export default function RestaurantCard({
  name, category, address, specialty, rating, ratingCount = 0, status, image, actionLabel, onViewMenu,
}: RestaurantCardData) {
  return (
    <article className="restaurant-card">
      <img
        className="restaurant-card__image"
        src={image.trim() ? image : restaurantImageFallback}
        alt={name}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = restaurantImageFallback;
        }}
      />
      <div className="restaurant-card__content">
        <div className="restaurant-card__title-row">
          <h2>{name}</h2>
          <span>{category}</span>
        </div>
        <div className="restaurant-card__details">
          <p>{specialty}</p>
          <p>{address}</p>
          {rating !== undefined
            ? <p aria-label={`Rated ${rating} out of 5`} className="restaurant-card__rating"><span aria-hidden="true">★</span> {rating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})</p>
            : <p className="restaurant-card__rating">No ratings yet</p>}
        </div>
        <span className={`restaurant-card__status restaurant-card__status--${status}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <button type="button" className="interactive-button restaurant-card__action" onClick={onViewMenu} disabled={status !== "open"}>
          {status === "open" ? (actionLabel ?? "View menu →") : "Menu unavailable"}
        </button>
      </div>
    </article>
  );
}
