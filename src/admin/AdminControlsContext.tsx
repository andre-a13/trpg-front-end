import {
  type PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../auth/useAuth";
import { AdminControlsContext, type AdminControlsValue } from "./admin-controls-context";

const STORAGE_KEY = "trpg.admin.manageCharacters";

function readStoredManageMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function AdminControlsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [storedManageMode, setStoredManageMode] = useState(readStoredManageMode);
  const isAdmin = user?.role === "admin";

  const setManageCharactersEnabled = useCallback((enabled: boolean) => {
    setStoredManageMode(enabled);
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }, []);

  const value = useMemo<AdminControlsValue>(
    () => ({
      isAdmin,
      manageCharactersEnabled: isAdmin && storedManageMode,
      setManageCharactersEnabled,
    }),
    [isAdmin, setManageCharactersEnabled, storedManageMode],
  );

  return <AdminControlsContext.Provider value={value}>{children}</AdminControlsContext.Provider>;
}
