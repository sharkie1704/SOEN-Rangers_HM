// this one is NOT opened from the map. it is shown in the courier's dashboard
import CommandButtons from "./CommandButtons";
import type { CommandItem } from "./PanelTypes";

interface Props {
  order: { id: string; restaurantName: string; state: string } | null;
  commands: CommandItem[]; // go on/off duty, accept offer, confirm pickup/delivery
  onCommand: (name: string) => void;
}

// deliberately shows no customer payment details (courier restriction, i assumed this)
export default function CourierOrderPanel({ order, commands, onCommand }: Props) {
  return (
    <section className="panel__section" aria-label="Your current order">
      <h3>Your current order</h3>
      {order ? (
        <p>{order.id} from {order.restaurantName}: {order.state}</p>
      ) : (
        <p className="panel__empty">No order assigned</p>
      )}
      <CommandButtons commands={commands} onCommand={onCommand} />
    </section>
  );
}