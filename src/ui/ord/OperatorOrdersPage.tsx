import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import type { OperatorRestaurant } from "./OperatorRestaurantsPage";
import "../dash/operator-dashboard.css";

type OrderStatus = "Placed" | "Accepted" | "Preparing" | "Ready" | "PickedUp" | "Delivered" | "Rejected" | "Cancelled";

type OperatorOrder = {
  id: number;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  lines: readonly { name: string; quantity: number }[];
  totalCents: number;
  placedAt: string;
};

type DispatchOrder = {
  position: number;
  orderId: number;
  restaurantId: string;
  restaurantName: string;
  readyAt: string;
};

type Props = {
  restaurants: readonly OperatorRestaurant[];
};

const statusNames: readonly (OrderStatus | "All")[] = [
  "All", "Placed", "Accepted", "Preparing", "Ready", "PickedUp", "Delivered", "Rejected", "Cancelled",
];

const statusLabels: Record<OrderStatus, string> = {
  Placed: "Placed",
  Accepted: "Accepted",
  Preparing: "Preparing",
  Ready: "Ready for pickup",
  PickedUp: "Picked up",
  Delivered: "Delivered",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusClass(status: OrderStatus): string {
  return `operator-orders__status operator-orders__status--${status.toLowerCase()}`;
}

export function restaurantDisplayName(
  order: Pick<OperatorOrder, "restaurantId" | "restaurantName">,
  restaurants: readonly OperatorRestaurant[],
): string {
  const restaurant = restaurants.find((candidate) => candidate.id === order.restaurantId);
  if (restaurant) return restaurant.name;
  return order.restaurantName === order.restaurantId ? "Restaurant" : order.restaurantName;
}

export default function OperatorOrdersPage({ restaurants }: Props) {
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [waiting, setWaiting] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const requestId = useRef(0);

  const restaurantKey = restaurants.map(({ id }) => id).join(",");

  async function loadOrders(isRefresh = false) {
    const currentRequest = ++requestId.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [dispatch, ...restaurantResults] = await Promise.all([
        api<{ waiting: DispatchOrder[] }>("/api/dispatch/queue"),
        ...restaurants.map(async (restaurant) => {
          const result = await api<{ orders: OperatorOrder[] }>(
            `/api/restaurants/${encodeURIComponent(restaurant.id)}/orders/all`,
          );
          return result.orders;
        }),
      ]);
      if (currentRequest === requestId.current) {
        setWaiting(dispatch.waiting);
        setOrders(restaurantResults.flat());
      }
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof ApiError ? cause.message : "Could not load operator order data.");
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!active) return;
      await loadOrders();
    };
    void load();
    const events = new EventSource("/api/command-events");
    events.addEventListener("command", () => { void loadOrders(true); });
    return () => {
      active = false;
      requestId.current += 1;
      events.close();
    };
  }, [restaurantKey]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...orders]
      .filter((order) => statusFilter === "All" || order.status === statusFilter)
      .filter((order) => !query
        || String(order.id).includes(query)
        || restaurantDisplayName(order, restaurants).toLocaleLowerCase().includes(query)
        || order.lines.some((line) => line.name.toLocaleLowerCase().includes(query)))
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  }, [orders, restaurants, search, statusFilter]);

  const activeCount = orders.filter((order) =>
    order.status === "Placed" || order.status === "Accepted" || order.status === "Preparing" || order.status === "Ready" || order.status === "PickedUp",
  ).length;

  return (
    <section className="operator-orders" aria-label="Platform orders">
      <header className="operator-orders__header">
        <div>
          <p className="operator-orders__eyebrow">OPERATIONS</p>
          <h1>Orders</h1>
          <p>Monitor order progress across all restaurants. Operator view is read-only.</p>
        </div>
        <button type="button" className="operator-orders__refresh" onClick={() => void loadOrders(true)} disabled={loading || refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="operator-orders__metrics" aria-label="Order metrics">
        <article><span>All orders</span><strong>{loading ? "—" : orders.length}</strong></article>
        <article><span>In progress</span><strong>{loading ? "—" : activeCount}</strong></article>
        <article><span>Waiting for dispatch</span><strong>{loading ? "—" : waiting.length}</strong></article>
      </div>

      {waiting.length > 0 && (
        <section className="operator-orders__dispatch" aria-label="Dispatch queue">
          <div className="operator-orders__section-heading">
            <div>
              <h2>Waiting for courier assignment</h2>
              <p>Ready orders are listed from longest waiting to most recent.</p>
            </div>
            <span>{waiting.length} waiting</span>
          </div>
          <ol>
            {waiting.map((entry) => (
              <li key={entry.orderId}>
                <strong>#{entry.orderId}</strong>
                <span>{entry.restaurantName}</span>
                <span>Ready {new Date(entry.readyAt).toLocaleString()}</span>
                <span className="operator-orders__position">Queue position {entry.position}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="operator-orders__filters">
        <label>
          <span>Search orders</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Order number, restaurant, or item"
          />
        </label>
        <label>
          <span>Order status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as OrderStatus | "All")}>
            {statusNames.map((status) => (
              <option key={status} value={status}>{status === "All" ? "All statuses" : statusLabels[status]}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="operator-orders__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadOrders(true)} disabled={refreshing}>Try again</button>
        </div>
      )}
      {loading && <p className="operator-orders__message" role="status">Loading platform orders…</p>}
      {!loading && !error && filteredOrders.length === 0 && (
        <div className="operator-orders__empty">
          <strong>{orders.length === 0 ? "No orders yet" : "No matching orders"}</strong>
          <p>{orders.length === 0 ? "New customer orders will appear here." : "Try changing the search or status filter."}</p>
        </div>
      )}
      {!loading && filteredOrders.length > 0 && (
        <div className="operator-orders__table-wrap" role="region" aria-label="Orders table" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Restaurant</th>
                <th scope="col">Items</th>
                <th scope="col">Placed</th>
                <th scope="col">Order subtotal</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <th scope="row">#{order.id}</th>
                  <td>{restaurantDisplayName(order, restaurants)}</td>
                  <td>{order.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")}</td>
                  <td>{new Date(order.placedAt).toLocaleString()}</td>
                  <td>{money(order.totalCents)}</td>
                  <td><span className={statusClass(order.status)}>{statusLabels[order.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
