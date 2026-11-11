import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";
import type { RestaurantStatus } from "../../domain/ord/Restaurant";
import { BAND_COLOURS, queueBand } from "./QueueBand";
import type { GeoPoint } from "./MapProjection";
import PublicRestaurantPanel from "./map-popup/PublicRestaurantPopup";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

export type MapRestaurant = GeoPoint & {
  id: string;
  name: string;
  status: RestaurantStatus;
  queue: { length: number };
};

export type MapCourier = GeoPoint & {
  id: string;
  name: string;
  status: "OFFLINE" | "IDLE" | "ASSIGNED" | "CARRYING";
};

interface Props {
  restaurants: MapRestaurant[];
  couriers: MapCourier[];
  showLabels?: boolean;
  selectedRestaurantId: string | null; // null means nothing is selected
  onSelectRestaurant: (id: string | null) => void;
  // these are role specific extras, so that the same map can be used for different roles (public, operator, courier)
  highlightedRestaurantId?: string;
  highlightedCourierId?: string;
  deliveryPin?: GeoPoint;
  route?: readonly [GeoPoint, GeoPoint];
  // role-specific drawer content. it falls back to the public panel 
  renderDetails?: (restaurant: MapRestaurant) => ReactNode;
}

const MONTREAL_ISLAND_BOUNDS: [[number, number], [number, number]] = [
  [45.38, -74.02],
  [45.72, -73.43],
];
const MONTREAL_CENTER: LatLngTuple = [45.52, -73.62];
const MAX_AUTO_ZOOM = 14;

function RestaurantMapMarker({
  restaurant, showLabel, selected, highlighted, onSelect,
}: {
  restaurant: MapRestaurant;
  showLabel: boolean;
  selected: boolean;
  highlighted: boolean;
  onSelect: (id: string) => void;
}) {
  const band = queueBand({ status: restaurant.status, queue: restaurant.queue });
  const icon = useMemo(
    () =>
      L.divIcon({
        className: [
          "map-view__restaurant-icon",
          `map-view__restaurant-icon--${band}`,
          selected ? "map-view__restaurant-icon--selected" : "",
          highlighted ? "map-view__restaurant-icon--own" : "",
        ].filter(Boolean).join(" "),
        html: `<span class="map-view__restaurant-pin" style="background-color:${BAND_COLOURS[band]}"></span>`,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      }),
    [band, selected, highlighted],
  );

  return (
    <Marker
      position={[restaurant.lat, restaurant.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(restaurant.id) }}
      alt={`${restaurant.name}, ${restaurant.queue.length} queued`}
    >
      {showLabel && (
        <Tooltip direction="top" offset={[0, -28]} permanent>
          {restaurant.name} · {restaurant.queue.length} queued
        </Tooltip>
      )}
    </Marker>
  );
}

function CourierMapMarker({ courier, highlighted }: { courier: MapCourier; highlighted: boolean }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: [
          "map-view__courier-icon",
          `map-view__courier-icon--${courier.status.toLowerCase()}`,
          highlighted ? "map-view__courier-icon--own" : "",
        ].filter(Boolean).join(" "),
        html: "<span>C</span>",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    [courier.status, highlighted],
  );

  return (
    <Marker position={[courier.lat, courier.lng]} icon={icon} alt={`${courier.name}, ${courier.status}`}>
      <Tooltip>{highlighted ? "You" : courier.name} · {courier.status.toLowerCase()}</Tooltip>
    </Marker>
  );
}

function DeliveryPinMarker({ point }: { point: GeoPoint }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "map-view__home-icon",
        html: '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9"/></svg></span>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [],
  );
  return (
    <Marker position={[point.lat, point.lng]} icon={icon} alt="Your home location">
      <Tooltip>Your home location</Tooltip>
    </Marker>
  );
}

function FitMapToMarkers({ points, fitKey }: { points: GeoPoint[]; fitKey: string }) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    const pts = pointsRef.current;
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], MAX_AUTO_ZOOM);
      return;
    }
    map.fitBounds(
      L.latLngBounds(pts.map(({ lat, lng }) => [lat, lng] as LatLngTuple)),
      { padding: [36, 36], maxZoom: MAX_AUTO_ZOOM },
    );
  }, [map, fitKey]);

  return null;
}

export default function MapView({
  restaurants,
  couriers,
  showLabels = true,
  selectedRestaurantId,
  onSelectRestaurant,
  highlightedRestaurantId,
  highlightedCourierId,
  deliveryPin,
  route,
  renderDetails,
}: Props) {
  // R-DASH-02: only on-duty couriers are drawn
  const onDutyCouriers = useMemo(
    () => couriers.filter((courier) => courier.status !== "OFFLINE"),
    [couriers],
  );

  const points = useMemo<GeoPoint[]>(
    () => [...restaurants, ...onDutyCouriers, ...(deliveryPin ? [deliveryPin] : []), ...(route ? [...route] : [])],
    [restaurants, onDutyCouriers, deliveryPin, route],
  );

  const fitKey = useMemo(
    () =>
      [
        ...restaurants.map((r) => `${r.id}:${r.lat},${r.lng}`),
        ...onDutyCouriers.map((courier) => courier.id),
        deliveryPin ? `pin:${deliveryPin.lat},${deliveryPin.lng}` : "",
        route ? `route:${route.map((point) => `${point.lat},${point.lng}`).join(";")}` : "",
      ].join("|"),
    [restaurants, onDutyCouriers, deliveryPin, route],
  );

  const isEmpty = points.length === 0;

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);

  return (
    <div className="map-view">
      <MapContainer
        className="map-view__canvas"
        center={MONTREAL_CENTER}
        zoom={11}
        minZoom={10}
        maxZoom={18}
        maxBounds={MONTREAL_ISLAND_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitMapToMarkers points={points} fitKey={fitKey} />
        {restaurants.map((r) => (
          <RestaurantMapMarker
            key={r.id}
            restaurant={r}
            showLabel={showLabels}
            selected={r.id === selectedRestaurantId}
            highlighted={r.id === highlightedRestaurantId}
            onSelect={onSelectRestaurant}
          />
        ))}
        {onDutyCouriers.map((courier) => (
          <CourierMapMarker key={courier.id} courier={courier} highlighted={courier.id === highlightedCourierId} />
        ))}
        {deliveryPin && <DeliveryPinMarker point={deliveryPin} />}
        {route && (
          <Polyline
            positions={route.map((point) => [point.lat, point.lng] as LatLngTuple)}
            pathOptions={{ color: "#4B3028", weight: 3, dashArray: "8 8" }}
          />
        )}
      </MapContainer>

      {isEmpty && (
        <div className="map-view__empty">No restaurants or on-duty couriers to display</div>
      )}

      {selectedRestaurant && (
        <aside className="map-view__drawer" aria-label={`${selectedRestaurant.name} details`}>
          <button
            className="map-view__drawer-close"
            type="button"
            aria-label="Close restaurant details"
            onClick={() => onSelectRestaurant(null)}
          >
            ×
          </button>
          {renderDetails
            ? renderDetails(selectedRestaurant)
            : <PublicRestaurantPanel restaurant={selectedRestaurant} />}
        </aside>
      )}
    </div>
  );
}
