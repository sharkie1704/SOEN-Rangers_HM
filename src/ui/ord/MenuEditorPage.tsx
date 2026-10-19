import { useEffect, useState } from "react";
import { api } from "../reg/api/client";
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
    <main
      style={{
        backgroundColor: "#FFF9F2",
        minHeight: "100vh",
        padding: "40px 24px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ color: "#4B3028", fontSize: "32px", margin: "0 0 32px" }}>
          Manage your menu
        </h1>

        {loading && <p>Loading menu...</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && <p>Your menu is empty.</p>}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "12px" }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                backgroundColor: "#F3E6D6",
                border: "1px solid #D9B48F",
                borderRadius: "12px",
              }}
            >
              <div>
                <strong style={{ color: "#4B3028" }}>{item.name}</strong>
                <span style={{ color: "#4B3028", marginLeft: "12px" }}>{formatPrice(item.priceCents)}</span>
              </div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: item.available ? "#2F6B2F" : "#8A2E2E",
                  backgroundColor: item.available ? "#E3F1DF" : "#F6DEDE",
                }}
              >
                {item.available ? "Available" : "Sold out"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
