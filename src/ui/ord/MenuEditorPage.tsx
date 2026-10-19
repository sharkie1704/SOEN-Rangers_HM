import { useEffect, useState } from "react";
import { api } from "../reg/api/client";

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

  return (
    <section>
      <h2>Manage your menu</h2>

      {loading && <p>Loading menu...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <p>Your menu is empty.</p>}

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} ({formatPrice(item.priceCents)}) {item.available ? "Available" : "Sold out"}
          </li>
        ))}
      </ul>
    </section>
  );
}
