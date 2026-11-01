import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Dices } from "lucide-react";
import { useTranslation } from "react-i18next";
import inventionService from "../../services/invention.service";
import type { InventionStateDto } from "../../types/api";
import {
  drawWithInventionCooldown,
  InventionCooldownError,
  inventionCooldownKey,
  readInventionCooldown,
} from "./inventionCooldown";
import "./inventions.scss";

type Props = { characterId: number; slug: string };

export default function InventionsModule({ characterId, slug }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<InventionStateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now);

  const syncCooldown = useCallback(() => {
    setNow(Date.now());
    try {
      setCooldownEndsAt(readInventionCooldown(window.localStorage, characterId));
      setStorageUnavailable(false);
    } catch {
      setStorageUnavailable(true);
    }
  }, [characterId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await inventionService.getState(slug));
    } catch {
      setError(t("inventions.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    syncCooldown();
    const timer = window.setInterval(syncCooldown, 1000);
    const onStorage = (event: StorageEvent) => {
      if (event.key === inventionCooldownKey(characterId) || event.key === null) {
        syncCooldown();
        void refresh();
      }
    };
    const onFocus = () => { syncCooldown(); void refresh(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [characterId, refresh, syncCooldown]);

  async function draw() {
    if (busyRef.current || !state?.enabled || !state.permissions.canDraw) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const action = () => drawWithInventionCooldown(
        window.localStorage, characterId, () => inventionService.draw(slug),
      );
      const drawn = navigator.locks
        ? await navigator.locks.request(inventionCooldownKey(characterId), action)
        : await action();
      setState(drawn.result);
      setCooldownEndsAt(drawn.cooldownEndsAt);
      setNow(Date.now());
    } catch (cause) {
      if (cause instanceof InventionCooldownError) {
        syncCooldown();
      } else if (axios.isAxiosError(cause)) {
        setError(t(cause.response?.status === 409 ? "inventions.errors.notEnough" : "inventions.errors.draw"));
      } else {
        setError(t("inventions.errors.storage"));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (loading && !state) return <p>{t("common.loading")}</p>;
  if (!state) return (
    <div className="inventions-module">
      <p role="alert">{error}</p>
      <button type="button" onClick={() => void refresh()}>{t("inventions.retry")}</button>
    </div>
  );

  const remaining = cooldownEndsAt - now;
  const canDraw = state.enabled && state.permissions.canDraw;

  return (
    <div className="inventions-module" aria-busy={busy}>
      {error && <p className="inventions-error" role="alert">{error}</p>}
      {canDraw && storageUnavailable && <p className="inventions-error" role="alert">{t("inventions.errors.storage")}</p>}
      {!state.enabled && <p>{t("inventions.inactive")}</p>}
      {canDraw && (
        <div className="inventions-module__actions">
          <button type="button" disabled={busy || remaining > 0 || storageUnavailable} onClick={() => void draw()}>
            <Dices size={16} aria-hidden="true" />
            {t(busy ? "inventions.drawing" : "inventions.draw", { count: state.drawCount })}
          </button>
        </div>
      )}
      {state.items.length === 0 ? <p>{t("inventions.empty")}</p> : (
        <ul className="inventions-module__list">
          {state.items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              {item.description && <p>{item.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
