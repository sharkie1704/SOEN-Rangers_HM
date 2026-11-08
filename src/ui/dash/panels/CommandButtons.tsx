import type { CommandItem } from "./PanelTypes";

interface Props {
  commands: CommandItem[];
  onCommand: (name: string) => void;
}

export default function CommandButtons({ commands, onCommand }: Props) {
  if (commands.length === 0) return null;
  return (
    <div className="panel__commands">
      {commands.map((c) => (
        <button
          key={c.name}
          type="button"
          disabled={!c.enabled}
          title={!c.enabled ? c.reason : undefined}
          onClick={() => onCommand(c.name)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}