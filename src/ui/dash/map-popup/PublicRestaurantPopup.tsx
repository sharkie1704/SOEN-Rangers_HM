import type { MapRestaurant } from "../MapView";
import { BAND_COLOURS, queueBand } from "../QueueBand";

// Shared by the marker and popup so unknown queues never look empty.
export function getQueuePresentation(restaurant: Pick<MapRestaurant, "status" | "queue">) {
  if (typeof restaurant.queue.length !== "number") {
    const band = restaurant.status === "PAUSED" ? "long" : "unknown";
    return {
      band,
      color: band === "long" ? BAND_COLOURS.long : "#757575",
      label: restaurant.queue.availability === "loading" ? "Queue loading…" : "Queue unavailable",
    };
  }
  const band = queueBand({ status: restaurant.status, queue: { length: restaurant.queue.length } });
  return { band, color: BAND_COLOURS[band], label: `${restaurant.queue.length} queued` };
}

export default function PublicRestaurantPanel({ restaurant }: { restaurant: MapRestaurant }) {
  const { color, label } = getQueuePresentation(restaurant);
  return (
    <>
      <p className="map-view__drawer-eyebrow">RESTAURANT</p>
      <h2>{restaurant.name}</h2>
      <div className="map-view__drawer-status">
        <span className="map-view__drawer-dot" style={{ backgroundColor: color }} />
        {restaurant.status}
      </div>
      <dl>
        <div>
          <dt>Queue</dt>
          <dd>{typeof restaurant.queue.length === "number" ? `${restaurant.queue.length} order(s)` : label}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{restaurant.lat.toFixed(4)}, {restaurant.lng.toFixed(4)}</dd>
        </div>
      </dl>
    </>
  );
}
