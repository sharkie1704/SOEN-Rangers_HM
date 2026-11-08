import type { MapRestaurant } from "../MapView";
import PublicRestaurantPanel from "./PublicRestaurantPopup";

interface Props {
  restaurant: MapRestaurant;
  status: "OPEN" | "CLOSED" | "PAUSED";
  onViewMenu: () => void;
}

export default function CustomerRestaurantPanel({ restaurant, status, onViewMenu }: Props) {
  return (
    <>
      <PublicRestaurantPanel restaurant={restaurant} />
      <div className="panel__section" style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "center", paddingBottom: "8px" }}>
        <button
        type="button"
        className="interactive-button"
        onClick={onViewMenu}
        disabled={status !== "OPEN"}
        style={{
            alignSelf: "center",
            display: "block",
            padding: "10px 18px",
            backgroundColor: status === "OPEN" ? "#C66B32" : "#BCA99B",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            fontFamily: "inherit",
            fontWeight: 600,
            cursor: status === "OPEN" ? "pointer" : "not-allowed",
        }}
        >
        {status === "OPEN" ? "View Menu" : "Menu unavailable"}
        </button>
      </div>
    </>
  );
}