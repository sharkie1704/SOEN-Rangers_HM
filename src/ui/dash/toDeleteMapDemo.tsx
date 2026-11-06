import { useState } from 'react';
import MapView, { type MapRestaurant } from './MapView';
import type { Courier } from '../../domain/reg/Courier';

const restaurants: MapRestaurant[] = [
  { id: 'r1', name: 'Short Queue', lat: 45.42, lng: -73.70, status: 'OPEN', queue: { length: 1 } },
  { id: 'r2', name: 'Building', lat: 45.50, lng: -73.60, status: 'OPEN', queue: { length: 4 } },
  { id: 'r3', name: 'Long Queue', lat: 45.58, lng: -73.52, status: 'OPEN', queue: { length: 7 } },
  { id: 'r4', name: 'Paused', lat: 45.46, lng: -73.55, status: 'PAUSED', queue: { length: 0 } },
];
const couriers: Courier[] = [];

export default function MapDemo() {
  const [labels, setLabels] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  return (
    <div style={{ height: '80vh' }}>
      <button onClick={() => setLabels(l => !l)}>Toggle labels</button>
      <button onClick={() => setEmpty(e => !e)}>Toggle empty data</button>
      <MapView
        restaurants={empty ? [] : restaurants}
        couriers={empty ? [] : couriers}
        showLabels={labels}
        selectedRestaurantId={selected}
        onSelectRestaurant={setSelected}
      />
    </div>
  );
}