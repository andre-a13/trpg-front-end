import React from "react";
import { useTranslation } from "react-i18next";
import type Character from "../../../models/character";
import characterService from "../../../services/character.service";
import type { SkillSet } from "../../../types/character";
import type { SaveStatusReporter } from "./useSaveStatus";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PORTRAIT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const BACKGROUND_IMAGE_MAX_SIZE = 15 * 1024 * 1024;

interface UseCharacterCardStateParams {
    character: Character;
    portraitUrl?: string;
    refresh: () => void;
    saveStatus: SaveStatusReporter;
}

export const useCharacterCardState = ({
    character,
    portraitUrl,
    refresh,
    saveStatus,
}: UseCharacterCardStateParams) => {
    const { t } = useTranslation();
    const [stats, setStats] = React.useState<SkillSet>(character.stats);
    const [primarySkills, setPrimarySkills] = React.useState<string[]>(character.skillsPrimary ?? []);
    const [secondarySkills, setSecondarySkills] = React.useState<string[]>(character.skillsSecondary ?? []);
    const [currentHp, setCurrentHp] = React.useState(character.current_hp);
    const [bonusHealth, setBonusHealth] = React.useState(character.bonusHealth ?? 0);
    const [localPortraitUrl, setLocalPortraitUrl] = React.useState(character.portraitUrl ?? portraitUrl ?? "");
    const [localBackgroundUrl, setLocalBackgroundUrl] = React.useState(character.backgroundUrl ?? "");
    const [isPortraitUploading, setIsPortraitUploading] = React.useState(false);
    const [isBackgroundUploading, setIsBackgroundUploading] = React.useState(false);
    const [portraitUploadError, setPortraitUploadError] = React.useState<string | null>(null);
    const [backgroundUploadError, setBackgroundUploadError] = React.useState<string | null>(null);
    const baseMaxHp = React.useMemo(() => Math.round((stats.corps / 5) + 5), [stats.corps]);
    const maxHp = React.useMemo(() => baseMaxHp + bonusHealth, [baseMaxHp, bonusHealth]);
    const previousStatsRef = React.useRef(character.stats);
    const statsSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const portraitPreviewUrlRef = React.useRef<string | null>(null);
    const backgroundPreviewUrlRef = React.useRef<string | null>(null);
    const { markUnsaved, runSave } = saveStatus;

    React.useEffect(() => {
        setStats(character.stats);
        setPrimarySkills(character.skillsPrimary ?? []);
        setSecondarySkills(character.skillsSecondary ?? []);
        previousStatsRef.current = character.stats;
        setCurrentHp(character.current_hp);
        setBonusHealth(character.bonusHealth ?? 0);
        setLocalPortraitUrl(character.portraitUrl ?? portraitUrl ?? "");
        setLocalBackgroundUrl(character.backgroundUrl ?? "");
        setPortraitUploadError(null);
        setBackgroundUploadError(null);
    }, [character.backgroundUrl, character.bonusHealth, character.current_hp, character.portraitUrl, character.skillsPrimary, character.skillsSecondary, character.slug, character.stats, portraitUrl]);

    React.useEffect(() => {
        return () => {
            if (portraitPreviewUrlRef.current) URL.revokeObjectURL(portraitPreviewUrlRef.current);
            if (backgroundPreviewUrlRef.current) URL.revokeObjectURL(backgroundPreviewUrlRef.current);
        };
    }, []);

    React.useEffect(() => {
        const previousStats = previousStatsRef.current;
        const statsChanged =
            stats.corps !== previousStats.corps ||
            stats.mental !== previousStats.mental ||
            stats.social !== previousStats.social;

        if (!statsChanged) return;

        if (statsSaveTimerRef.current) clearTimeout(statsSaveTimerRef.current);

        statsSaveTimerRef.current = setTimeout(async () => {
            try {
                await runSave(() => characterService.patch(character.slug, { stats }));
                previousStatsRef.current = stats;
            } catch (error) {
                console.error("Failed to update stats:", error);
                setStats(previousStatsRef.current);
            }
        }, 500);

        return () => {
            if (statsSaveTimerRef.current) clearTimeout(statsSaveTimerRef.current);
        };
    }, [character.slug, runSave, stats]);

    const updateStat = (key: keyof SkillSet, value: number) => {
        markUnsaved();
        setStats((currentStats) => ({
            ...currentStats,
            [key]: value,
        }));
    };

    const savePrimarySkills = async (updatedSkills: string[]) => {
        const previousSkills = primarySkills;
        setPrimarySkills(updatedSkills);

        try {
            await runSave(() => characterService.patch(character.slug, { skillsPrimary: updatedSkills }));
        } catch (error) {
            console.error("Failed to update primary skills:", error);
            setPrimarySkills(previousSkills);
        }
    };

    const addPrimarySkill = async (value: string) => {
        const newSkill = value.trim();
        if (!newSkill) return;

        savePrimarySkills([...primarySkills, newSkill]);
    };

    const deletePrimarySkill = (index: number) => {
        const updatedSkills = primarySkills.filter((_, skillIndex) => skillIndex !== index);
        savePrimarySkills(updatedSkills);
    };

    const movePrimarySkill = (fromIndex: number, toIndex: number) => {
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= primarySkills.length || toIndex >= primarySkills.length) return;

        const updatedSkills = [...primarySkills];
        const [movedSkill] = updatedSkills.splice(fromIndex, 1);
        updatedSkills.splice(toIndex, 0, movedSkill);
        savePrimarySkills(updatedSkills);
    };

    const saveSecondarySkills = async (updatedSkills: string[]) => {
        const previousSkills = secondarySkills;
        setSecondarySkills(updatedSkills);

        try {
            await runSave(() => characterService.patch(character.slug, { skillsSecondary: updatedSkills }));
        } catch (error) {
            console.error("Failed to update secondary skills:", error);
            setSecondarySkills(previousSkills);
        }
    };

    const addSecondarySkill = async (value: string) => {
        const newSkill = value.trim();
        if (!newSkill) return;

        saveSecondarySkills([...secondarySkills, newSkill]);
    };

    const deleteSecondarySkill = (index: number) => {
        const updatedSkills = secondarySkills.filter((_, skillIndex) => skillIndex !== index);
        saveSecondarySkills(updatedSkills);
    };

    const moveSecondarySkill = (fromIndex: number, toIndex: number) => {
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= secondarySkills.length || toIndex >= secondarySkills.length) return;

        const updatedSkills = [...secondarySkills];
        const [movedSkill] = updatedSkills.splice(fromIndex, 1);
        updatedSkills.splice(toIndex, 0, movedSkill);
        saveSecondarySkills(updatedSkills);
    };

    const updateHp = async (nextHp: number) => {
        const clampedHp = Math.max(0, Math.min(nextHp, maxHp));
        if (clampedHp === currentHp) return;

        const previousHp = currentHp;
        setCurrentHp(clampedHp);
        markUnsaved();

        try {
            await runSave(() => characterService.patch(character.slug, { current_hp: clampedHp }));
        } catch (error) {
            console.error("Failed to update HP:", error);
            setCurrentHp(previousHp);
        }
    };

    const increaseHp = async () => {
        if (currentHp < maxHp) {
            updateHp(currentHp + 1);
            return;
        }

        const previousHp = currentHp;
        const previousBonusHealth = bonusHealth;
        const nextHp = currentHp + 1;
        const nextBonusHealth = bonusHealth + 1;

        setCurrentHp(nextHp);
        setBonusHealth(nextBonusHealth);
        markUnsaved();

        try {
            await runSave(() => characterService.patch(character.slug, {
                bonusHealth: nextBonusHealth,
                current_hp: nextHp,
            }));
        } catch (error) {
            console.error("Failed to update bonus health:", error);
            setCurrentHp(previousHp);
            setBonusHealth(previousBonusHealth);
        }
    };

    const decreaseHp = async () => {
        if (bonusHealth > 0 && currentHp > baseMaxHp) {
            const previousHp = currentHp;
            const previousBonusHealth = bonusHealth;
            const nextHp = currentHp - 1;
            const nextBonusHealth = bonusHealth - 1;

            setCurrentHp(nextHp);
            setBonusHealth(nextBonusHealth);
            markUnsaved();

            try {
                await runSave(() => characterService.patch(character.slug, {
                    bonusHealth: nextBonusHealth,
                    current_hp: nextHp,
                }));
            } catch (error) {
                console.error("Failed to update bonus health:", error);
                setCurrentHp(previousHp);
                setBonusHealth(previousBonusHealth);
            }

            return;
        }

        updateHp(currentHp - 1);
    };

    const uploadPortrait = async (file: File) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setPortraitUploadError(t("characterCard.upload.invalidFormat"));
            return;
        }

        if (file.size > PORTRAIT_IMAGE_MAX_SIZE) {
            setPortraitUploadError(t("characterCard.upload.tooLarge"));
            return;
        }

        if (portraitPreviewUrlRef.current) {
            URL.revokeObjectURL(portraitPreviewUrlRef.current);
        }

        const previewUrl = URL.createObjectURL(file);
        portraitPreviewUrlRef.current = previewUrl;
        setLocalPortraitUrl(previewUrl);
        setPortraitUploadError(null);
        setIsPortraitUploading(true);
        markUnsaved();

        try {
            const publicUrl = await runSave(() => characterService.uploadPortrait(character.slug, file));
            setLocalPortraitUrl(publicUrl);
            refresh();
        } catch (error) {
            console.error("Failed to upload portrait:", error);
            setLocalPortraitUrl(character.portraitUrl ?? portraitUrl ?? "");
            setPortraitUploadError(t("characterCard.upload.failed"));
        } finally {
            setIsPortraitUploading(false);
            if (portraitPreviewUrlRef.current === previewUrl) {
                URL.revokeObjectURL(previewUrl);
                portraitPreviewUrlRef.current = null;
            }
        }
    };

    const uploadBackground = async (file: File) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setBackgroundUploadError(t("characterCard.upload.invalidFormat"));
            return false;
        }

        if (file.size > BACKGROUND_IMAGE_MAX_SIZE) {
            setBackgroundUploadError(t("characterCard.upload.backgroundTooLarge"));
            return false;
        }

        if (backgroundPreviewUrlRef.current) {
            URL.revokeObjectURL(backgroundPreviewUrlRef.current);
        }

        const previewUrl = URL.createObjectURL(file);
        backgroundPreviewUrlRef.current = previewUrl;
        setLocalBackgroundUrl(previewUrl);
        setBackgroundUploadError(null);
        setIsBackgroundUploading(true);
        markUnsaved();

        try {
            const publicUrl = await runSave(() => characterService.uploadBackground(character.slug, file));
            setLocalBackgroundUrl(publicUrl);
            refresh();
            return true;
        } catch (error) {
            console.error("Failed to upload background:", error);
            setLocalBackgroundUrl(character.backgroundUrl ?? "");
            setBackgroundUploadError(t("characterCard.upload.failed"));
            return false;
        } finally {
            setIsBackgroundUploading(false);
            if (backgroundPreviewUrlRef.current === previewUrl) {
                URL.revokeObjectURL(previewUrl);
                backgroundPreviewUrlRef.current = null;
            }
        }
    };

    const removeBackground = async () => {
        const previousBackgroundUrl = localBackgroundUrl;
        setLocalBackgroundUrl("");
        setBackgroundUploadError(null);
        markUnsaved();

        try {
            await runSave(() => characterService.patch(character.slug, { backgroundUrl: null }));
            refresh();
            return true;
        } catch (error) {
            console.error("Failed to remove background:", error);
            setLocalBackgroundUrl(previousBackgroundUrl);
            setBackgroundUploadError(t("characterCard.upload.removeFailed"));
            return false;
        }
    };

    const clearBackgroundUploadError = () => {
        setBackgroundUploadError(null);
    };

    return {
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
    };
};
