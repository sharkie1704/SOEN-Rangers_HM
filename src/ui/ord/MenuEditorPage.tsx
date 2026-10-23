import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";
import "./button-interactions.css";

export type EditableMenuItem = {
  id: number;
  restaurantId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  available: boolean;
};

type MenuEditorPageInputs = {
  restaurantId: string;
};

export const page = { backgroundColor: "#FFF9F2", minHeight: "100vh", padding: "32px 24px", fontFamily: "'Poppins', sans-serif", color: "#4B3028" };
export const row = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const, padding: "12px 16px", backgroundColor: "#F3E6D6", border: "1px solid #D9B48F", borderRadius: "8px" };
export const input = { padding: "6px 8px", border: "1px solid #D9B48F", borderRadius: "6px", fontFamily: "inherit" };
export const primary = { padding: "6px 14px", backgroundColor: "#C66B32", color: "#FFFFFF", border: "none", borderRadius: "6px", fontFamily: "inherit", fontWeight: 600, cursor: "pointer" };
export const secondary = { ...primary, backgroundColor: "transparent", color: "#C66B32", border: "1px solid #C66B32" };

export type RestaurantStatus = "OPEN" | "PAUSED" | "CLOSED";

export function statusLabel(status: RestaurantStatus): string {
  return { OPEN: "Open", PAUSED: "Paused", CLOSED: "Closed" }[status];
}

function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export default function MenuEditorPage({ restaurantId }: MenuEditorPageInputs) {
  const [items, setItems] = useState<EditableMenuItem[]>([]);
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadMenu() {
      try {
        const path = `/api/restaurants/${encodeURIComponent(restaurantId)}`;
        const [details, menu] = await Promise.all([
          api<{ restaurant: { status: RestaurantStatus } }>(path),
          api<{ menuItems: EditableMenuItem[] }>(`${path}/menu`),
        ]);
        if (!cancelled) {
          setRestaurantStatus(details.restaurant.status);
          setItems(menu.menuItems);
        }
      } catch {
        if (!cancelled) setError("Could not load your menu. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMenu();
    return () => { cancelled = true; };
  }, [restaurantId]);

  const [message, setMessage] = useState("");
  const itemPath = (id: number) => `/api/restaurants/${encodeURIComponent(restaurantId)}/menu/${id}`;

  function showError(e: unknown) {
    setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Error: request failed");
  }

  async function changeStatus(status: "PAUSED" | "OPEN") {
    try {
      const res = await api<{ restaurant: { status: RestaurantStatus }; eventId: number }>(
        `/api/restaurants/${encodeURIComponent(restaurantId)}/status`,
        { method: "PATCH", body: { status } },
      );
      setRestaurantStatus(res.restaurant.status);
      setMessage(`Restaurant ${status === "PAUSED" ? "paused" : "reopened"} (event #${res.eventId})`);
    } catch (e) {
      showError(e);
    }
  }

  async function toggleAvailable(item: EditableMenuItem) {
    try {
      const res = await api<{ item: EditableMenuItem; eventId: number | null }>(itemPath(item.id), {
        method: "PATCH",
        body: { available: !item.available },
      });
      setItems((current) => current.map((i) => (i.id === res.item.id ? res.item : i)));
      setMessage(`${res.item.name} marked ${res.item.available ? "available" : "sold out"} (event #${res.eventId})`);
    } catch (e) {
      showError(e);
    }
  }

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api<{ item: EditableMenuItem }>(
        `/api/restaurants/${encodeURIComponent(restaurantId)}/menu`,
        { method: "POST", body: { name: newName, priceCents: Math.round(Number(newPrice) * 100) } },
      );
      setItems((current) => [...current, res.item]);
      setMessage(`${res.item.name} added`);
      setNewName("");
      setNewPrice("");
    } catch (e) {
      showError(e);
    }
  }

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  function startEdit(item: EditableMenuItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice((item.priceCents / 100).toFixed(2));
  }

  async function saveEdit(item: EditableMenuItem) {
    try {
      const res = await api<{ item: EditableMenuItem }>(itemPath(item.id), {
        method: "PATCH",
        body: { name: editName, priceCents: Math.round(Number(editPrice) * 100) },
      });
      setItems((current) => current.map((i) => (i.id === res.item.id ? res.item : i)));
      setMessage(`${res.item.name} updated`);
      setEditingId(null);
    } catch (e) {
      showError(e);
    }
  }

  async function removeItem(item: EditableMenuItem) {
    try {
      await api<void>(itemPath(item.id), { method: "DELETE" });
      setItems((current) => current.filter((i) => i.id !== item.id));
      setMessage(`${item.name} removed`);
    } catch (e) {
      showError(e);
    }
  }

  return (
    <section style={page}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "28px", margin: "0 0 16px" }}>Manage your menu</h2>

        {restaurantStatus && (
          <div style={{ ...row, marginBottom: "16px" }}>
            <span>Restaurant status: <strong>{statusLabel(restaurantStatus)}</strong></span>
            {restaurantStatus === "OPEN" && (
              <button className="interactive-button" style={{ ...primary, marginLeft: "auto" }} onClick={() => changeStatus("PAUSED")}>
                Pause restaurant
              </button>
            )}
            {restaurantStatus === "PAUSED" && (
              <button className="interactive-button" style={{ ...secondary, marginLeft: "auto" }} onClick={() => changeStatus("OPEN")}>
                Reopen restaurant
              </button>
            )}
          </div>
        )}

        {loading && <p>Loading menu...</p>}
        {error && <p className="error">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 600 }}>{message}</p>}

        <form onSubmit={addItem} style={{ ...row, marginBottom: "16px" }}>
          <label>Name <input style={input} value={newName} onChange={(e) => setNewName(e.target.value)} required /></label>
          <label>Price ($) <input style={{ ...input, width: "90px" }} type="number" step="0.01" min="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required /></label>
          <button type="submit" className="interactive-button" style={primary}>Add item</button>
        </form>
        {!loading && !error && items.length === 0 && <p>Your menu is empty.</p>}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
          {items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <form onSubmit={(e) => { e.preventDefault(); saveEdit(item); }} style={row}>
                  <label>Name <input style={input} value={editName} onChange={(e) => setEditName(e.target.value)} required /></label>
                  <label>Price ($) <input style={{ ...input, width: "90px" }} type="number" step="0.01" min="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required /></label>
                  <button type="submit" className="interactive-button" style={primary}>Save</button>
                  <button type="button" className="interactive-button" style={secondary} onClick={() => setEditingId(null)}>Cancel</button>
                </form>
              ) : (
                <div style={row}>
                  <strong>{item.name}</strong>
                  <span>{formatPrice(item.priceCents)}</span>
                  <span style={{ color: item.available ? "#2F6B2F" : "#8A2E2E", fontWeight: 600 }}>
                    {item.available ? "Available" : "Sold out"}
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                    <button className="interactive-button" style={secondary} onClick={() => startEdit(item)}>Edit</button>
                    <button className="interactive-button" style={primary} onClick={() => toggleAvailable(item)}>
                      {item.available ? "Mark sold out" : "Mark available"}
                    </button>
                    <button className="interactive-button" style={secondary} onClick={() => removeItem(item)}>Remove</button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
