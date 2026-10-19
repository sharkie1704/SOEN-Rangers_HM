import { useEffect, useState } from "react";
import { api, ApiError } from "../reg/api/client";

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

function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export default function MenuEditorPage({ restaurantId }: MenuEditorPageInputs) {
  const [items, setItems] = useState<EditableMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadMenu() {
      try {
        const menu = await api<{ menuItems: EditableMenuItem[] }>(
          `/api/restaurants/${encodeURIComponent(restaurantId)}/menu`,
        );
        if (!cancelled) setItems(menu.menuItems);
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
    <section>
      <h2>Manage your menu</h2>

      {loading && <p>Loading menu...</p>}
      {error && <p className="error">{error}</p>}
      {message && <p role="status">{message}</p>}

      <form onSubmit={addItem}>
        <label>Name <input value={newName} onChange={(e) => setNewName(e.target.value)} required /></label>{" "}
        <label>Price ($) <input type="number" step="0.01" min="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required /></label>{" "}
        <button type="submit">Add item</button>
      </form>
      {!loading && !error && items.length === 0 && <p>Your menu is empty.</p>}

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {editingId === item.id ? (
              <form onSubmit={(e) => { e.preventDefault(); saveEdit(item); }}>
                <label>Name <input value={editName} onChange={(e) => setEditName(e.target.value)} required /></label>{" "}
                <label>Price ($) <input type="number" step="0.01" min="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required /></label>{" "}
                <button type="submit">Save</button>{" "}
                <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </form>
            ) : (
              <>
                {item.name} ({formatPrice(item.priceCents)}) {item.available ? "Available" : "Sold out"}{" "}
                <button onClick={() => startEdit(item)}>Edit</button>{" "}
                <button onClick={() => toggleAvailable(item)}>
                  {item.available ? "Mark sold out" : "Mark available"}
                </button>{" "}
                <button onClick={() => removeItem(item)}>Remove</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
