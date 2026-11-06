import type { Restaurant } from '../../domain/ord/Restaurant';
import type { PreparationQueue } from '../../domain/ord/PreparationQueue';
import { queueBand, BAND_COLOURS } from './QueueBand';

type MarkerRestaurant = Pick<Restaurant, 'id' | 'status'> & {
  name: string;
  queue: Pick<PreparationQueue, 'length'>;
};

interface Props {
  restaurant: MarkerRestaurant;
  x: number;
  y: number;
  showLabel?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export default function RestaurantMarker({ restaurant, x, y, showLabel, selected, onSelect }: Props) {
  const fill = BAND_COLOURS[queueBand({ status: restaurant.status, queue: restaurant.queue })];
  return (
    <g onClick={() => onSelect?.(restaurant.id)} style={{ cursor: 'pointer' }}
       data-testid={`restaurant-${restaurant.id}`}>
      <path
        d="M 0 -12 C 7 -12 11 -7 11 -1 C 11 5 5 10 0 15 C -5 10 -11 5 -11 -1 C -11 -7 -7 -12 0 -12 Z"
        transform={`translate(${x} ${y})`}
        fill={fill}
        stroke="#222"
        strokeWidth={selected ? 3 : 1}
      />
      {showLabel && (
        <text x={x + 14} y={y + 4} fontSize={12}>
          {restaurant.name} · {restaurant.queue.length} queued
        </text>
      )}
    </g>
  );
}
