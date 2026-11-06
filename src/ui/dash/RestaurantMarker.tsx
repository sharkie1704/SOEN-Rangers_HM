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
      <circle cx={x} cy={y} r={selected ? 11 : 8} fill={fill} stroke="#222" strokeWidth={selected ? 3 : 1} />
      {showLabel && (
        <text x={x + 14} y={y + 4} fontSize={12}>
          {restaurant.name} · {restaurant.queue.length} queued
        </text>
      )}
    </g>
  );
}
