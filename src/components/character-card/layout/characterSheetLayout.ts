export const MODULE_IDS = ["identity", "portrait", "stats", "skills", "inventory", "notes"] as const;

export type FixedModuleId = typeof MODULE_IDS[number];
export type ModuleId = FixedModuleId | `inventory-category:${number}`;

export type ModuleLayout = {
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
    minimized: boolean;
};

export type CharacterSheetLayout = Record<string, ModuleLayout>;

const fixedDefaults = (): Record<FixedModuleId, ModuleLayout> => ({
    identity: { x: 28, y: 92, width: 340, height: 170, z: 1, minimized: false },
    portrait: { x: 392, y: 72, width: 230, height: 350, z: 2, minimized: false },
    notes: { x: 650, y: 72, width: 330, height: 350, z: 3, minimized: false },
    stats: { x: 28, y: 296, width: 446, height: 226, z: 4, minimized: false },
    skills: { x: 512, y: 452, width: 366, height: 420, z: 5, minimized: false },
    inventory: { x: 28, y: 568, width: 446, height: 390, z: 6, minimized: false },
});

export const createDefaultDynamicLayout = (index: number): ModuleLayout => ({
    x: 512 + ((index % 2) * 28),
    y: 920 + (index * 48),
    width: 392,
    height: 360,
    z: 7 + index,
    minimized: false,
});

export const createDefaultLayout = (dynamicIds: ModuleId[] = []): CharacterSheetLayout => {
    const layout: CharacterSheetLayout = fixedDefaults();

    dynamicIds.forEach((id, index) => {
        layout[id] = createDefaultDynamicLayout(index);
    });

    return layout;
};

const LAYOUT_STORAGE_VERSION = "v4";

const getLayoutStorageKey = (slug: string) => `trpg-character-layout:${LAYOUT_STORAGE_VERSION}:${slug}`;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === "object" && value !== null
);

const readFiniteNumber = (value: unknown, fallback: number) => {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const readLayoutItem = (value: unknown, fallback: ModuleLayout): ModuleLayout => {
    if (!isRecord(value)) return fallback;

    return {
        x: readFiniteNumber(value.x, fallback.x),
        y: readFiniteNumber(value.y, fallback.y),
        width: readFiniteNumber(value.width, fallback.width),
        height: readFiniteNumber(value.height, fallback.height),
        z: readFiniteNumber(value.z, fallback.z),
        minimized: typeof value.minimized === "boolean" ? value.minimized : fallback.minimized,
    };
};

export const ensureLayoutModules = (
    layout: CharacterSheetLayout,
    dynamicIds: ModuleId[] = [],
): CharacterSheetLayout => {
    const defaults = createDefaultLayout(dynamicIds);
    const nextLayout: CharacterSheetLayout = {};

    Object.entries(defaults).forEach(([id, fallback]) => {
        nextLayout[id] = readLayoutItem(layout[id], fallback);
    });

    return nextLayout;
};

const sanitizeLayout = (value: unknown, dynamicIds: ModuleId[] = []): CharacterSheetLayout => {
    if (!isRecord(value)) return createDefaultLayout(dynamicIds);
    return ensureLayoutModules(value as CharacterSheetLayout, dynamicIds);
};

export const loadLayout = (slug: string, dynamicIds: ModuleId[] = []): CharacterSheetLayout => {
    if (typeof window === "undefined" || !slug) return createDefaultLayout(dynamicIds);

    try {
        const storedLayout = window.localStorage.getItem(getLayoutStorageKey(slug));
        return storedLayout ? sanitizeLayout(JSON.parse(storedLayout), dynamicIds) : createDefaultLayout(dynamicIds);
    } catch {
        return createDefaultLayout(dynamicIds);
    }
};

export const saveLayout = (slug: string, layout: CharacterSheetLayout) => {
    if (typeof window === "undefined" || !slug) return;

    try {
        window.localStorage.setItem(getLayoutStorageKey(slug), JSON.stringify(layout));
    } catch {
        return;
    }
};
