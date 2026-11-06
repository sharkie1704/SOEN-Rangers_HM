import { useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import mapImage from '../../assets/map-image.jpg';
import type { Courier } from '../../domain/reg/Courier';
import type { RestaurantStatus } from '../../domain/ord/Restaurant';
import { computeBounds, project, type GeoPoint } from './MapProjection';
import { useElementSize } from './UseElementSize';
import RestaurantMarker from './RestaurantMarker';
// import CourierMarker from './CourierMarker';

interface Props {
  restaurants: MapRestaurant[];
  couriers: Courier[];
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

const PADDING = 40;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;
const MAP_IMAGE_ASPECT = 1729 / 980;
const MAP_IMAGE_SCALE = 1.25;

export default function MapView({
  restaurants, couriers: _couriers, showLabels = true, selectedRestaurantId, onSelectRestaurant,
}: Props) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(null);

//   // R-DASH-02: only on-duty couriers are drawn
//   const onDuty = couriers.filter(c => c.state !== 'offline');

//   // One shared bounds for ALL markers so both kinds use the same scale
//   const bounds = computeBounds([...restaurants, ...onDuty]);

  const bounds = computeBounds(restaurants);
  const fittedImageWidth = Math.min(width, height * MAP_IMAGE_ASPECT);
  const imageWidth = fittedImageWidth * MAP_IMAGE_SCALE;
  const imageHeight = imageWidth / MAP_IMAGE_ASPECT;
  const imageX = (width - imageWidth) / 2;
  const imageY = (height - imageHeight) / 2;

  function changeZoom(delta: number) {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y };
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragStart.current) return;
    setPan({
      x: dragStart.current.panX + event.clientX - dragStart.current.pointerX,
      y: dragStart.current.panY + event.clientY - dragStart.current.pointerY,
    });
  }

  function stopDragging(event: PointerEvent<SVGSVGElement>) {
    dragStart.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resetView() {
    setZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', minHeight: 400, position: 'relative', overflow: 'hidden', background: '#e8f0f3' }}>
      {!bounds ? (
        // minimal guard; will need to turns this into the full empty-map handling
        <p>No restaurants or couriers to display</p>
      ) : (
        width > 0 && height > 0 && (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label="City map"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              style={{ display: 'block', touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
            >
              <defs>
                <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#c6d9df" strokeWidth="1" />
                  <path d="M 16 0 L 16 32 M 0 16 L 32 16" fill="none" stroke="#d8e6e9" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={width} height={height} fill="#e8f0f3" />
              <g transform={`translate(${pan.x} ${pan.y}) translate(${width / 2} ${height / 2}) scale(${zoom}) translate(${-width / 2} ${-height / 2})`}>
                <image
                  href={mapImage}
                  x={imageX}
                  y={imageY}
                  width={imageWidth}
                  height={imageHeight}
                  preserveAspectRatio="none"
                  opacity="0.82"
                />
                <rect x={imageX} y={imageY} width={imageWidth} height={imageHeight} fill="url(#map-grid)" opacity="0.38" />
                {restaurants.map(r => {
                  const { x, y } = project(r, bounds, imageWidth, imageHeight, PADDING);
                  const markerX = x + imageX;
                  const markerY = y + imageY;
                  return (
                    <g key={r.id} transform={`translate(${markerX} ${markerY}) scale(${1 / zoom}) translate(${-markerX} ${-markerY})`}>
                      <RestaurantMarker restaurant={r} x={markerX} y={markerY}
                        showLabel={showLabels} selected={r.id === selectedRestaurantId}
                        onSelect={onSelectRestaurant} />
                    </g>
                  );
                })}
              </g>
            {/* {onDuty.map(c => {
              const { x, y } = project(c, bounds, width, height, PADDING);
              return <CourierMarker key={c.id} courier={c} x={x} y={y} />;
            })} */}
            </svg>
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
              {zoom !== DEFAULT_ZOOM && (<button type="button" aria-label="Reset map view" onClick={resetView}>Reset Zoom</button>)}
              <button type="button" aria-label="Zoom in" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom === MAX_ZOOM}>+</button>
              <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom === MIN_ZOOM}>−</button>
            </div>
          </>
        )
      )}
    </div>
  );
}