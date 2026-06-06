import { createContext } from "react";

export type AdminControlsValue = {
  isAdmin: boolean;
  manageCharactersEnabled: boolean;
  setManageCharactersEnabled: (enabled: boolean) => void;
};

export const AdminControlsContext = createContext<AdminControlsValue | undefined>(undefined);
