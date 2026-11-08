export interface PanelOrder {
  id: string;
  state: string; // placed, accepted, preparing, ready, etc.
}

export interface CommandItem {
  name: string; // used by dispatchCommand
  label: string;
  enabled: boolean;
  reason?: string; // shown as a tooltip when disabled
}