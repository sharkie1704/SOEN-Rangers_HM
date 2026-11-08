import type { MapRestaurant } from "../MapView";
import PublicRestaurantPanel from "./PublicRestaurantPanel";
import CommandButtons from "./CommandButtons";
import type { CommandItem } from "./PanelTypes";

interface Props {
  restaurant: MapRestaurant;
  commands: CommandItem[]; 
  onCommand: (name: string) => void;
}

export default function CustomerRestaurantPanel({ restaurant, commands, onCommand }: Props) {
  return (
    <>
      <PublicRestaurantPanel restaurant={restaurant} />
      <div className="panel__section">
        <h3>Order</h3>
        <CommandButtons commands={commands} onCommand={onCommand} />
      </div>
    </>
  );
}