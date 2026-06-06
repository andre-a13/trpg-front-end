import React from "react";
import { GripVertical, Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ModuleId, ModuleLayout } from "./characterSheetLayout";

type DragState = {
    mode: "move" | "resize";
    resizeEdge?: "left" | "right";
    hasMoved: boolean;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
};

interface SheetModuleProps {
    id: ModuleId;
    title: string;
    layout: ModuleLayout;
    className?: string;
    children: React.ReactNode;
    workbenchRef: React.RefObject<HTMLDivElement | null>;
    onBringToFront: (id: ModuleId) => void;
    onLayoutChange: (id: ModuleId, patch: Partial<ModuleLayout>) => void;
    editable?: boolean;
}

const clamp = (value: number, min: number, max: number) => {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
};

const EDGE_PADDING = 8;
const DRAG_START_THRESHOLD = 4;
const MIN_MODULE_WIDTH = 190;
const MIN_MODULE_HEIGHT = 120;
const MINIMIZED_HEIGHT = 42;

export const SheetModule: React.FC<SheetModuleProps> = ({
    id,
    title,
    layout,
    className,
    children,
    workbenchRef,
    onBringToFront,
    onLayoutChange,
    editable = false,
}) => {
    const { t } = useTranslation();
    const moduleRef = React.useRef<HTMLElement | null>(null);
    const dragStateRef = React.useRef<DragState | null>(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const isCollapsed = layout.minimized && !isFullscreen;

    const getWorkbenchSize = React.useCallback(() => ({
        width: workbenchRef.current?.clientWidth ?? 1280,
        height: workbenchRef.current?.clientHeight ?? 900,
    }), [workbenchRef]);

    const getMaxModuleWidth = React.useCallback((workbenchWidth: number) => {
        return Math.max(MIN_MODULE_WIDTH, workbenchWidth - EDGE_PADDING * 2);
    }, []);

    const getBoundedX = React.useCallback((x: number, width: number, workbenchWidth: number) => {
        return clamp(x, EDGE_PADDING, workbenchWidth - width - EDGE_PADDING);
    }, []);

    React.useEffect(() => {
        if (!isFullscreen) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsFullscreen(false);
        };

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [isFullscreen]);

    React.useLayoutEffect(() => {
        if (isFullscreen) return;

        const syncHorizontalBounds = () => {
            const workbenchWidth = workbenchRef.current?.clientWidth;
            if (!workbenchWidth) return;

            const nextWidth = Math.min(layout.width, getMaxModuleWidth(workbenchWidth));
            const nextX = getBoundedX(layout.x, nextWidth, workbenchWidth);

            if (nextWidth === layout.width && nextX === layout.x) return;
            onLayoutChange(id, { x: nextX, width: nextWidth });
        };

        syncHorizontalBounds();

        const workbench = workbenchRef.current;
        if (typeof ResizeObserver === "undefined" || !workbench) {
            window.addEventListener("resize", syncHorizontalBounds);
            return () => window.removeEventListener("resize", syncHorizontalBounds);
        }

        const observer = new ResizeObserver(syncHorizontalBounds);
        observer.observe(workbench);

        return () => observer.disconnect();
    }, [
        getBoundedX,
        getMaxModuleWidth,
        id,
        isFullscreen,
        layout.width,
        layout.x,
        onLayoutChange,
        workbenchRef,
    ]);

    const beginInteraction = (event: React.PointerEvent, mode: DragState["mode"], resizeEdge?: DragState["resizeEdge"]) => {
        if (!editable) return;
        if (isFullscreen) return;
        if (event.button !== 0) return;
        if (mode === "resize" && isCollapsed) return;
        event.preventDefault();
        event.stopPropagation();
        onBringToFront(id);
        moduleRef.current?.setPointerCapture(event.pointerId);
        dragStateRef.current = {
            mode,
            resizeEdge,
            hasMoved: false,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: layout.x,
            startY: layout.y,
            startWidth: layout.width,
            startHeight: layout.height,
        };
    };

    const toggleMinimized = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!editable) return;
        event.stopPropagation();
        onBringToFront(id);
        onLayoutChange(id, { minimized: !layout.minimized });
    };

    const toggleFullscreen = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onBringToFront(id);
        setIsFullscreen((value) => !value);
    };

    const updateInteraction = (event: React.PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const dx = event.clientX - dragState.startPointerX;
        const dy = event.clientY - dragState.startPointerY;
        const { width: workbenchWidth, height: workbenchHeight } = getWorkbenchSize();

        if (dragState.mode === "move") {
            if (!dragState.hasMoved && Math.hypot(dx, dy) < DRAG_START_THRESHOLD) return;
            dragState.hasMoved = true;
            event.preventDefault();

            const nextWidth = Math.min(dragState.startWidth, getMaxModuleWidth(workbenchWidth));
            onLayoutChange(id, {
                x: getBoundedX(dragState.startX + dx, nextWidth, workbenchWidth),
                y: clamp(dragState.startY + dy, EDGE_PADDING, Math.max(EDGE_PADDING, workbenchHeight - 80)),
                ...(nextWidth !== dragState.startWidth ? { width: nextWidth } : {}),
            });
            return;
        }

        event.preventDefault();

        if (dragState.resizeEdge === "left") {
            const rightEdge = Math.min(dragState.startX + dragState.startWidth, workbenchWidth - EDGE_PADDING);
            const nextX = clamp(dragState.startX + dx, EDGE_PADDING, rightEdge - MIN_MODULE_WIDTH);
            const nextWidth = rightEdge - nextX;

            onLayoutChange(id, {
                x: nextX,
                width: nextWidth,
                height: clamp(dragState.startHeight + dy, MIN_MODULE_HEIGHT, Math.max(150, workbenchHeight - dragState.startY - EDGE_PADDING)),
            });
            return;
        }

        onLayoutChange(id, {
            width: clamp(dragState.startWidth + dx, MIN_MODULE_WIDTH, getMaxModuleWidth(workbenchWidth - dragState.startX + EDGE_PADDING)),
            height: clamp(dragState.startHeight + dy, MIN_MODULE_HEIGHT, Math.max(150, workbenchHeight - dragState.startY - EDGE_PADDING)),
        });
    };

    const endInteraction = (event: React.PointerEvent) => {
        if (!dragStateRef.current) return;

        dragStateRef.current = null;
        if (moduleRef.current?.hasPointerCapture(event.pointerId)) {
            moduleRef.current.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <>
            {isFullscreen && (
                <div
                    className="ccard-moduleBackdrop"
                    aria-hidden="true"
                    onClick={() => setIsFullscreen(false)}
                />
            )}
            <section
                ref={moduleRef}
                className={`ccard-module ccard-module--${id} ${editable ? "is-editable" : ""} ${isCollapsed ? "is-minimized" : ""} ${isFullscreen ? "is-fullscreen" : ""} ${className ?? ""}`}
                style={isFullscreen ? { zIndex: 1001 } : {
                    left: layout.x,
                    top: layout.y,
                    width: layout.width,
                    height: isCollapsed ? MINIMIZED_HEIGHT : layout.height,
                    zIndex: layout.z,
                }}
                aria-label={title}
                role={isFullscreen ? "dialog" : undefined}
                aria-modal={isFullscreen ? true : undefined}
                onPointerDown={() => onBringToFront(id)}
                onPointerMove={updateInteraction}
                onPointerUp={endInteraction}
                onPointerCancel={endInteraction}
            >
                <header
                    className="ccard-moduleHeader"
                    onPointerDown={editable ? (event) => beginInteraction(event, "move") : undefined}
                >
                    {editable && (
                        <button
                            type="button"
                            className="ccard-moduleGrip"
                            aria-label={t("characterCard.moduleActions.move", { title })}
                            title={t("characterCard.moduleActions.move", { title })}
                            onPointerDown={(event) => beginInteraction(event, "move")}
                        >
                            <GripVertical size={16} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                    )}
                    <h2 className="ccard-moduleTitle">{title}</h2>
                    {editable && (
                        <button
                            type="button"
                            className="ccard-moduleMinimize"
                            aria-label={layout.minimized ? t("characterCard.moduleActions.restore", { title }) : t("characterCard.moduleActions.minimize", { title })}
                            aria-expanded={!layout.minimized}
                            title={layout.minimized ? t("characterCard.moduleActions.restore", { title }) : t("characterCard.moduleActions.minimize", { title })}
                            disabled={isFullscreen}
                            onClick={toggleMinimized}
                            onPointerDown={(event) => event.stopPropagation()}
                        >
                            {layout.minimized ? (
                                <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                            ) : (
                                <Minus size={15} strokeWidth={2.2} aria-hidden="true" />
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        className="ccard-moduleFullscreen"
                        aria-label={isFullscreen ? t("characterCard.moduleActions.exitFullscreen", { title }) : t("characterCard.moduleActions.enterFullscreen", { title })}
                        title={isFullscreen ? t("characterCard.moduleActions.exitFullscreen", { title }) : t("characterCard.moduleActions.enterFullscreen", { title })}
                        onClick={toggleFullscreen}
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        {isFullscreen ? (
                            <Minimize2 size={15} strokeWidth={2.2} aria-hidden="true" />
                        ) : (
                            <Maximize2 size={15} strokeWidth={2.2} aria-hidden="true" />
                        )}
                    </button>
                </header>
                <div className="ccard-moduleBody" aria-hidden={isCollapsed}>
                    {children}
                </div>
                {editable && (
                    <>
                        <button
                            type="button"
                            className="ccard-moduleResize ccard-moduleResize--left"
                            aria-label={t("characterCard.moduleActions.resizeLeft", { title })}
                            title={t("characterCard.moduleActions.resizeLeft", { title })}
                            disabled={isCollapsed || isFullscreen}
                            onPointerDown={(event) => beginInteraction(event, "resize", "left")}
                        >
                            <Maximize2 size={10} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="ccard-moduleResize ccard-moduleResize--right"
                            aria-label={t("characterCard.moduleActions.resizeRight", { title })}
                            title={t("characterCard.moduleActions.resizeRight", { title })}
                            disabled={isCollapsed || isFullscreen}
                            onPointerDown={(event) => beginInteraction(event, "resize", "right")}
                        >
                            <Maximize2 size={10} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    </>
                )}
            </section>
        </>
    );
};

export default SheetModule;
