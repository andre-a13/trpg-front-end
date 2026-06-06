import { useContext } from "react";
import { AdminControlsContext } from "./admin-controls-context";

export function useAdminControls() {
  const context = useContext(AdminControlsContext);
  if (!context) {
    throw new Error("useAdminControls must be used within AdminControlsProvider");
  }
  return context;
}
