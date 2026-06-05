import React from "react";
import { MoreVertical, Pencil, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./character-card.scss";
import "./identity/identity.scss";
import "./stats/stats.scss";
import "./portrait/portrait.scss";
import "./skills/skills.scss";

import { Identity } from "./identity/Identity";
import { Stats } from "./stats/Stats";
import { Portrait } from "./portrait/Portrait";
import { Skills } from "./skills/Skills";
import Inventory from "./inventory/Inventory";
import type Character from "../../models/character";
import Notes from "./notes/Notes";
import HpBadge from "./hpbadge/HpBadge";
import InventoryCategorySheet from "./inventory-category/InventoryCategorySheet";
import SheetModule from "./layout/SheetModule";
import { createDefaultDynamicLayout, type ModuleId } from "./layout/characterSheetLayout";
import { useCharacterSheetLayout } from "./layout/useCharacterSheetLayout";
import { useCharacterCardState } from "./hooks/useCharacterCardState";
import { useSaveStatus } from "./hooks/useSaveStatus";
import Modal, { type ModalHandle } from "../ui/modal/Modal";
import inventoryTableService from "../../services/inventory-table.service";

interface CharacterCardProps {
    character: Character;
    portraitUrl?: string;
    className?: string;
    refresh: () => void;
    designMode?: boolean;
    onToggleDesignMode?: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
    character,
    className,
    portraitUrl,
    refresh,
    designMode = false,
    onToggleDesignMode,
}) => {
    const { t } = useTranslation();
    const workbenchRef = React.useRef<HTMLDivElement | null>(null);
    const createCategoryModalRef = React.useRef<ModalHandle>(null);
    const backgroundUploadModalRef = React.useRef<ModalHandle>(null);
    const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
    const [categoryName, setCategoryName] = React.useState("");
    const [categoryStatus, setCategoryStatus] = React.useState<string | null>(null);
    const [categorySubmitting, setCategorySubmitting] = React.useState(false);
    const [backgroundFile, setBackgroundFile] = React.useState<File | null>(null);
    const saveStatus = useSaveStatus();
    const inventoryCategories = React.useMemo(
        () => [...(character.inventoryCategories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
        [character.inventoryCategories],
    );
    const categoryModuleIds = React.useMemo<ModuleId[]>(
        () => inventoryCategories.map((category) => `inventory-category:${category.id}` as ModuleId),
        [inventoryCategories],
    );
    const {
        layout,
        updateModuleLayout,
        bringModuleToFront,
        resetLayout,
    } = useCharacterSheetLayout(character.slug, categoryModuleIds);
    const {
        stats,
        primarySkills,
        secondarySkills,
        currentHp,
        maxHp,
        localPortraitUrl,
        localBackgroundUrl,
        isPortraitUploading,
        isBackgroundUploading,
        portraitUploadError,
        backgroundUploadError,
        updateStat,
        addPrimarySkill,
        deletePrimarySkill,
        movePrimarySkill,
        addSecondarySkill,
        deleteSecondarySkill,
        moveSecondarySkill,
        increaseHp,
        decreaseHp,
        uploadPortrait,
        uploadBackground,
        removeBackground,
        clearBackgroundUploadError,
    } = useCharacterCardState({ character, portraitUrl, refresh, saveStatus });
    const hasCustomBackground = Boolean(localBackgroundUrl);
    const sheetBackgroundStyle = hasCustomBackground
        ? { "--ccard-background-image": `url("${localBackgroundUrl.replace(/"/g, "%22")}")` } as React.CSSProperties
        : undefined;

    const moduleControls = {
        workbenchRef,
        onBringToFront: bringModuleToFront,
        onLayoutChange: updateModuleLayout,
    };

    const openCreateCategoryModal = () => {
        setActionMenuOpen(false);
        setCategoryStatus(null);
        createCategoryModalRef.current?.open();
    };

    const openBackgroundUploadModal = () => {
        setActionMenuOpen(false);
        setBackgroundFile(null);
        clearBackgroundUploadError();
        backgroundUploadModalRef.current?.open();
    };

    const submitBackgroundUpload: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (!backgroundFile) return;

        const uploaded = await uploadBackground(backgroundFile);
        if (uploaded) {
            setBackgroundFile(null);
            backgroundUploadModalRef.current?.close();
        }
    };

    const clearBackground = async () => {
        setActionMenuOpen(false);
        await removeBackground();
    };

    const createCategory: React.FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        const trimmedName = categoryName.trim();
        if (!trimmedName) return;

        setCategorySubmitting(true);
        setCategoryStatus(null);
        saveStatus.markUnsaved();

        try {
            await saveStatus.runSave(() => inventoryTableService.createCategory(character.slug, trimmedName));
            setCategoryName("");
            createCategoryModalRef.current?.close();
            refresh();
        } catch (error) {
            console.error("Failed to create inventory category:", error);
            setCategoryStatus(t("characterCard.customInventory.createFailed"));
        } finally {
            setCategorySubmitting(false);
        }
    };

    return (
        <main
            className={`ccard-sheet ${designMode ? "is-design-mode" : ""} ${hasCustomBackground ? "is-custom-background" : ""} ${className ?? ""}`}
            role="document"
            aria-label={t("characterCard.sheetLabel")}
            style={sheetBackgroundStyle}
        >
            <header className="ccard-topbar">
                <div className="ccard-heading">
                    <div className="ccard-titleGroup">
                        <h1 className="ccard-title">{character.name}</h1>
                    </div>
                    <div className="ccard-statusDock" aria-label={t("characterCard.statusLabel")}>
                        <HpBadge
                            absolute={false}
                            showIcon
                            currentHp={currentHp}
                            maxHp={maxHp}
                            onIncreaseHp={increaseHp}
                            onDecreaseHp={decreaseHp}
                            label={t("characterCard.hp.label")}
                        />
                    </div>
                </div>
                <div className="ccard-actions">
                    <div className="ccard-sessionState" aria-live="polite">
                        <span className={`ccard-modeLabel ${designMode ? "is-arrange" : "is-play"}`}>
                            {designMode ? t("characterCard.mode.arrange") : t("characterCard.mode.play")}
                        </span>
                        <span className={`ccard-saveStatus ccard-saveStatus--${saveStatus.status}`}>
                            {t(`characterCard.save.${saveStatus.status}`)}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="ccard-iconButton"
                        aria-label={t("characterCard.actions.resetLayout")}
                        title={t("characterCard.actions.resetLayout")}
                        onClick={resetLayout}
                    >
                        <RotateCcw size={17} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={`ccard-modeToggle ${designMode ? "is-active" : ""}`}
                        aria-label={designMode ? t("characterCard.actions.disableEditMode") : t("characterCard.actions.enableEditMode")}
                        aria-pressed={designMode}
                        title={designMode ? t("characterCard.actions.editModeActive") : t("characterCard.actions.enableEditMode")}
                        onClick={onToggleDesignMode}
                    >
                        <Pencil size={17} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <div className="ccard-actionMenu">
                        <button
                            type="button"
                            className="ccard-iconButton"
                            aria-label={t("characterCard.actions.openActionMenu")}
                            aria-expanded={actionMenuOpen}
                            aria-haspopup="menu"
                            title={t("characterCard.actions.openActionMenu")}
                            onClick={() => setActionMenuOpen((open) => !open)}
                        >
                            <MoreVertical size={17} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                        {actionMenuOpen && (
                            <div className="ccard-actionMenuPanel" role="menu">
                                <button type="button" role="menuitem" onClick={openBackgroundUploadModal}>
                                    {t("characterCard.background.upload")}
                                </button>
                                {hasCustomBackground && (
                                    <button type="button" role="menuitem" onClick={clearBackground}>
                                        {t("characterCard.background.remove")}
                                    </button>
                                )}
                                <button type="button" role="menuitem" onClick={openCreateCategoryModal}>
                                    {t("characterCard.customInventory.createTable")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="ccard-workbench" ref={workbenchRef}>
                <SheetModule id="identity" title={t("characterCard.modules.identity")} layout={layout.identity} {...moduleControls}>
                    <Identity race={character.race} firstTeam={character.teams[0]} />
                </SheetModule>

                <SheetModule id="portrait" title={t("characterCard.modules.portrait")} layout={layout.portrait} {...moduleControls}>
                    <Portrait
                        src={localPortraitUrl}
                        editable={designMode}
                        uploading={isPortraitUploading}
                        error={portraitUploadError}
                        onUpload={uploadPortrait}
                    />
                </SheetModule>

                <SheetModule id="notes" title={t("characterCard.modules.notes")} layout={layout.notes} {...moduleControls}>
                    <Notes
                        slug={character.slug}
                        notes={character.notes}
                        noteTabs={character.noteTabs}
                        variant="panel"
                        saveStatus={saveStatus}
                        refresh={refresh}
                    />
                </SheetModule>

                <SheetModule id="stats" title={t("characterCard.modules.stats")} layout={layout.stats} {...moduleControls}>
                    <Stats values={stats} editable={designMode} onChange={updateStat} />
                </SheetModule>

                <SheetModule id="skills" title={t("characterCard.modules.skills")} layout={layout.skills} {...moduleControls}>
                    <Skills
                        primary={primarySkills}
                        secondary={secondarySkills}
                        editable={designMode}
                        movable={designMode}
                        onAddPrimarySkill={addPrimarySkill}
                        onDeletePrimarySkill={deletePrimarySkill}
                        onMovePrimarySkill={movePrimarySkill}
                        onAddSecondarySkill={addSecondarySkill}
                        onDeleteSecondarySkill={deleteSecondarySkill}
                        onMoveSecondarySkill={moveSecondarySkill}
                    />
                </SheetModule>

                <SheetModule id="inventory" title={t("characterCard.modules.inventory")} layout={layout.inventory} {...moduleControls}>
                    <Inventory slug={character.slug} items={character.inventory ?? []} gold={character.gold} refresh={refresh} saveStatus={saveStatus} />
                </SheetModule>

                {inventoryCategories.map((category, index) => {
                    const moduleId = `inventory-category:${category.id}` as ModuleId;

                    return (
                        <SheetModule
                            key={category.id}
                            id={moduleId}
                            title={category.name}
                            layout={layout[moduleId] ?? createDefaultDynamicLayout(index)}
                            className="ccard-module--inventory-category"
                            {...moduleControls}
                        >
                            <InventoryCategorySheet
                                slug={character.slug}
                                category={category}
                                saveStatus={saveStatus}
                                refresh={refresh}
                            />
                        </SheetModule>
                    );
                })}
            </div>
            <Modal
                ref={createCategoryModalRef}
                title={t("characterCard.customInventory.createTable")}
                size="sm"
                align="center"
                panelClassName="notes-panel invAdd-panel"
                headerClassName="notes-header invAdd-header"
                titleClassName="notes-title invAdd-title"
                footerClassName="notes-actions"
                onClose={() => {
                    setActionMenuOpen(false);
                    setCategoryStatus(null);
                }}
            >
                <form className="ccard-createCategoryForm" onSubmit={createCategory}>
                    <label htmlFor={`inventory-category-name-${character.slug}`}>
                        {t("characterCard.customInventory.categoryName")}
                    </label>
                    <input
                        id={`inventory-category-name-${character.slug}`}
                        value={categoryName}
                        onChange={(event) => setCategoryName(event.target.value)}
                        placeholder={t("characterCard.customInventory.categoryPlaceholder")}
                        required
                        maxLength={100}
                        autoFocus
                    />
                    {categoryStatus && <p role="status">{categoryStatus}</p>}
                    <div className="ccard-createCategoryActions">
                        <button type="button" onClick={() => createCategoryModalRef.current?.close()}>
                            {t("common.actions.cancel")}
                        </button>
                        <button type="submit" disabled={categorySubmitting}>
                            {categorySubmitting ? t("characterCard.customInventory.creating") : t("common.actions.create")}
                        </button>
                    </div>
                </form>
            </Modal>
            <Modal
                ref={backgroundUploadModalRef}
                title={t("characterCard.background.upload")}
                subtitle={t("characterCard.background.modalSubtitle")}
                size="sm"
                align="center"
                panelClassName="notes-panel invAdd-panel"
                headerClassName="notes-header invAdd-header"
                titleClassName="notes-title invAdd-title"
                subtitleClassName="invAdd-subtitle"
                footerClassName="notes-actions"
                onClose={() => {
                    setActionMenuOpen(false);
                    setBackgroundFile(null);
                    clearBackgroundUploadError();
                }}
            >
                <form className="ccard-backgroundUploadForm" onSubmit={submitBackgroundUpload}>
                    <label htmlFor={`character-background-${character.slug}`}>
                        {t("characterCard.background.file")}
                    </label>
                    <input
                        id={`character-background-${character.slug}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                            setBackgroundFile(event.target.files?.[0] ?? null);
                            clearBackgroundUploadError();
                        }}
                    />
                    <p className="ccard-backgroundUploadHint">{t("characterCard.background.help")}</p>
                    {backgroundUploadError && <p className="ccard-backgroundUploadError" role="alert">{backgroundUploadError}</p>}
                    <div className="ccard-createCategoryActions">
                        <button type="button" onClick={() => backgroundUploadModalRef.current?.close()}>
                            {t("common.actions.cancel")}
                        </button>
                        <button type="submit" disabled={!backgroundFile || isBackgroundUploading}>
                            {isBackgroundUploading ? t("characterCard.background.uploading") : t("common.actions.save")}
                        </button>
                    </div>
                </form>
            </Modal>
        </main>
    );
};

export default CharacterCard;
