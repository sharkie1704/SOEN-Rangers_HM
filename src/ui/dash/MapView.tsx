import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";
import type { RestaurantStatus } from "../../domain/ord/Restaurant";
import { BAND_COLOURS, queueBand } from "./QueueBand";
import type { GeoPoint } from "./MapProjection";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

interface Props {
  restaurants: MapRestaurant[];
  couriers: MapCourier[];
  showLabels?: boolean;
  selectedRestaurantId?: string | null;
  onSelectRestaurant?: (id: string) => void;
}

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

const MONTREAL_ISLAND_BOUNDS: [[number, number], [number, number]] = [
  [45.38, -74.02],
  [45.72, -73.43],
];
const MONTREAL_CENTER: LatLngTuple = [45.52, -73.62];
const MAX_AUTO_ZOOM = 14;

function RestaurantMapMarker({
  restaurant,
  showLabel,
  selected,
  onSelect,
}: {
  restaurant: MapRestaurant;
  showLabel: boolean;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const band = queueBand(restaurant);
  const icon = L.divIcon({
    className: [
      "map-view__restaurant-icon",
      `map-view__restaurant-icon--${band}`,
      selected ? "map-view__restaurant-icon--selected" : "",
    ].filter(Boolean).join(" "),
    html: `<span class="map-view__restaurant-pin" style="background-color:${BAND_COLOURS[band]}"></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
  });

  return (
    <Marker
      position={[restaurant.lat, restaurant.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect?.(restaurant.id) }}
      alt={`${restaurant.name}, ${restaurant.queue.length} queued`}
    >
      {showLabel && (
        <Tooltip direction="top" offset={[0, -28]} permanent>
          {restaurant.name} · {restaurant.queue.length} queued
        </Tooltip>
      )}
      
      {/* to be changed to a mroe informative and user friendly popup */}
      <Popup>
        <strong>{restaurant.name}</strong>
        <br />
        {restaurant.status}
        <br />
        {restaurant.queue.length} queued
      </Popup>
    </Marker>
  );
}

function CourierMapMarker({ courier }: { courier: MapCourier }) {
  const icon = L.divIcon({
    className: `map-view__courier-icon map-view__courier-icon--${courier.status.toLowerCase()}`,
    html: "<span>C</span>",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <Marker position={[courier.lat, courier.lng]} icon={icon} alt={`${courier.name}, ${courier.status}`}>
      <Tooltip>{courier.name} · {courier.status.toLowerCase()}</Tooltip>
    </Marker>
  );
}

function FitMapToMarkers({ points }: { points: GeoPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], MAX_AUTO_ZOOM);
      return;
    }

    map.fitBounds(
      L.latLngBounds(points.map(({ lat, lng }) => [lat, lng] as LatLngTuple)),
      { padding: [36, 36], maxZoom: MAX_AUTO_ZOOM },
    );
  }, [map, points]);

  return null;
}

export default function MapView({
  restaurants,
  couriers,
  showLabels = true,
  selectedRestaurantId,
  onSelectRestaurant,
}: Props) {
  const onDutyCouriers = useMemo(
    () => couriers.filter((courier) => courier.status !== "OFFLINE"),
    [couriers],
  );
  const points = useMemo<GeoPoint[]>(
    () => [...restaurants, ...onDutyCouriers],
    [restaurants, onDutyCouriers],
  );

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
        <FitMapToMarkers points={points} />
        {restaurants.map((restaurant) => (
          <RestaurantMapMarker
            key={restaurant.id}
            restaurant={restaurant}
            showLabel={showLabels}
            selected={restaurant.id === selectedRestaurantId}
            onSelect={onSelectRestaurant}
          />
        ))}
        {onDutyCouriers.map((courier) => (
          <CourierMapMarker key={courier.id} courier={courier} />
        ))}
      </MapContainer>
      {points.length === 0 && (
        <div className="map-view__empty">
          No restaurants or on-duty couriers to display
        </div>
      )}
    </div>
  );
}
