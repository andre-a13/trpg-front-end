import React from "react";
import {
    createDefaultLayout,
    ensureLayoutModules,
    loadLayout,
    saveLayout,
    type CharacterSheetLayout,
    type ModuleId,
    type ModuleLayout,
} from "./characterSheetLayout";

export const useCharacterSheetLayout = (slug: string, dynamicIds: ModuleId[] = []) => {
    const dynamicKey = dynamicIds.join("|");
    const resolvedDynamicIds = React.useMemo<ModuleId[]>(
        () => dynamicKey ? dynamicKey.split("|") as ModuleId[] : [],
        [dynamicKey],
    );
    const [layout, setLayout] = React.useState<CharacterSheetLayout>(() => loadLayout(slug, resolvedDynamicIds));
    const skipNextLayoutSaveRef = React.useRef(false);

    React.useEffect(() => {
        skipNextLayoutSaveRef.current = true;
        setLayout(loadLayout(slug, resolvedDynamicIds));
    }, [slug, resolvedDynamicIds]);

    React.useEffect(() => {
        setLayout((currentLayout) => ensureLayoutModules(currentLayout, resolvedDynamicIds));
    }, [resolvedDynamicIds]);

    React.useEffect(() => {
        if (skipNextLayoutSaveRef.current) {
            skipNextLayoutSaveRef.current = false;
            return;
        }

        saveLayout(slug, layout);
    }, [slug, layout]);

    const updateModuleLayout = React.useCallback((id: ModuleId, patch: Partial<ModuleLayout>) => {
        setLayout((currentLayout) => ({
            ...currentLayout,
            [id]: {
                ...currentLayout[id],
                ...patch,
            },
        }));
    }, []);

    const bringModuleToFront = React.useCallback((id: ModuleId) => {
        setLayout((currentLayout) => {
            const currentTopZ = Math.max(...Object.values(currentLayout).map((item) => item.z));
            if (currentLayout[id].z === currentTopZ) return currentLayout;

            return {
                ...currentLayout,
                [id]: {
                    ...currentLayout[id],
                    z: currentTopZ + 1,
                },
            };
        });
    }, []);

    const resetLayout = React.useCallback(() => {
        setLayout(createDefaultLayout(resolvedDynamicIds));
    }, [resolvedDynamicIds]);

    return {
        layout,
        updateModuleLayout,
        bringModuleToFront,
        resetLayout,
    };
};
