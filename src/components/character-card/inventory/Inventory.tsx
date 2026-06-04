import React from "react";
import { useTranslation } from "react-i18next";
import characterService from "../../../services/character.service";
import type { SaveStatusReporter } from "../hooks/useSaveStatus";
import "../skills/skills.scss";
import "./inventory.scss";
import "./inventory-add-modal.scss";
import InventoryList from "./InventoryList";

interface InventoryProps {
  items: string[];
  title?: string;
  slug: string;
  gold?: number;
  refresh: () => void;
  saveStatus: SaveStatusReporter;
}

export const Inventory: React.FC<InventoryProps> = ({
  items = [],
  title,
  slug,
  gold,
  refresh,
  saveStatus,
}) => {
  const { t } = useTranslation();
  const inventoryTitle = title ?? t("characterCard.inventory.label");
  const goldTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentGoldRef = React.useRef<number>(gold ?? 0);
  const { markUnsaved, runSave } = saveStatus;
  const [localGold, setLocalGold] = React.useState<number>(gold ?? 0);

  React.useEffect(() => {
    if (typeof gold !== "number") return;

    setLocalGold(gold);
    lastSentGoldRef.current = gold;
  }, [gold]);

  React.useEffect(() => {
    if (!slug || localGold === lastSentGoldRef.current) return;

    if (goldTimerRef.current) clearTimeout(goldTimerRef.current);

    goldTimerRef.current = setTimeout(async () => {
      const previousGold = lastSentGoldRef.current;
      try {
        await runSave(() => characterService.patch(slug, { gold: localGold }));
        lastSentGoldRef.current = localGold;
      } catch (error) {
        console.error("Failed to update gold:", error);
        setLocalGold(previousGold);
      }
    }, 500);

    return () => {
      if (goldTimerRef.current) clearTimeout(goldTimerRef.current);
    };
  }, [localGold, runSave, slug]);

  const dec = () => {
    markUnsaved();
    setLocalGold((value) => Math.max(0, value - 1));
  };

  const inc = () => {
    markUnsaved();
    setLocalGold((value) => value + 1);
  };

  const saveInventory = async (updatedItems: string[], shouldRefresh: boolean) => {
    try {
      await runSave(() => characterService.patch(slug, { inventory: updatedItems }));
      if (shouldRefresh) refresh();
      return true;
    } catch (error) {
      console.error("Failed to save inventory:", error);
      refresh();
      return false;
    }
  };

  const goldControls = (
    <div className="ccard-coinCounter" role="group" aria-label={t("characterCard.inventory.gold")}>
      <button
        type="button"
        className="ccard-coinBtn"
        aria-label={t("characterCard.inventory.removeGold")}
        onClick={dec}
        disabled={localGold <= 0}
      >
        -
      </button>

      <div className="ccard-coinDisplay" title={t("characterCard.inventory.gold")}>
        <svg className="ccard-coinIcon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#F5C518" stroke="#a77b5b" strokeWidth="1" />
          <circle cx="8" cy="8" r="3" fill="rgba(255,255,255,0.35)" />
        </svg>
        <span className="ccard-coinValue">{localGold}</span>
      </div>

      <button
        type="button"
        className="ccard-coinBtn"
        aria-label={t("characterCard.inventory.addGold")}
        onClick={inc}
      >
        +
      </button>
    </div>
  );

  return (
    <InventoryList
      items={items}
      title={inventoryTitle}
      listId={slug}
      ariaLabel={t("characterCard.inventory.label")}
      modalSubtitle={t("characterCard.inventory.modalSubtitle")}
      itemNameLabel={t("characterCard.inventory.itemName")}
      itemPlaceholder={t("characterCard.inventory.itemPlaceholder")}
      emptyLabel={t("characterCard.inventory.empty")}
      saveStatus={saveStatus}
      actions={goldControls}
      onSaveItems={saveInventory}
    />
  );
};

export default Inventory;
