import { createContext, useContext } from "react";

export const DashboardOutputConsoleContext = createContext(false);

export function useDashboardOutputConsoleActive(): boolean {
  return useContext(DashboardOutputConsoleContext);
}
