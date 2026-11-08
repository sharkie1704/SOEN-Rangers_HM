import type { MapRestaurant } from "../MapView";
import { BAND_COLOURS, queueBand } from "../QueueBand";

export default function PublicRestaurantPanel({ restaurant }: { restaurant: MapRestaurant }) {
  const band = queueBand({ status: restaurant.status, queue: restaurant.queue });
  return (
    <>
      <p className="map-view__drawer-eyebrow">RESTAURANT</p>
      <h2>{restaurant.name}</h2>
      <div className="map-view__drawer-status">
        <span className="map-view__drawer-dot" style={{ backgroundColor: BAND_COLOURS[band] }} />
        {restaurant.status}
      </div>
      <dl>
        <div>
          <dt>Queue</dt>
          <dd>{restaurant.queue.length} order(s)</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{restaurant.lat.toFixed(4)}, {restaurant.lng.toFixed(4)}</dd>
        </div>
      </dl>
    </>
  );
}