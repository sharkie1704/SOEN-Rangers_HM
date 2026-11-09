import { useEffect, useState } from "react";
import type { OrderDTO } from "../../application/ord/OrderDTO.ts";
import { api, ApiError } from "../reg/api/client";
import "./operator-orders.css";

type OperatorOrder = Pick<OrderDTO, "id" | "restaurantName" | "status">;

export default function OperatorOrdersPage() {
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError("");
      try {
        const response = await api<{ orders: OperatorOrder[] }>("/api/orders/all");
        if (!cancelled) setOrders(response.orders);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Could not load orders. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => { cancelled = true; };
  }, [refreshCount]);

  return (
    <section className="operator-orders" aria-labelledby="operator-orders-heading">
      <header className="operator-orders__heading">
        <div>
          <h1 id="operator-orders-heading">All Orders</h1>
          <p>Orders across all restaurants and customers.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setRefreshCount((count) => count + 1)}>
          Refresh orders
        </button>
      </header>
      {error && <p className="operator-orders__error" role="alert">{error}</p>}
      <div className="operator-orders__table-wrap" role="region" aria-label="All orders table" tabIndex={0}>
        <table className="operator-orders__table" aria-label="All orders" aria-busy={loading}>
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Restaurant</th>
              <th scope="col">Status</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} role="status">Loading orders…</td></tr>
            ) : error ? (
              <tr><td colSpan={4}>Orders could not be loaded. Please try refreshing.</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={4}>No orders yet.</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id}>
                <th scope="row">#{order.id}</th>
                <td>{order.restaurantName}</td>
                <td>{order.status}</td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
