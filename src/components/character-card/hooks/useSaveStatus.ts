import React from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "failed";

export type SaveStatusReporter = {
    markUnsaved: () => void;
    runSave: <T>(operation: () => Promise<T>) => Promise<T>;
};

const MIN_SAVING_VISIBLE_MS = 500;

export const useSaveStatus = () => {
    const [status, setStatus] = React.useState<SaveStatus>("saved");
    const pendingSavesRef = React.useRef(0);
    const savingStartedAtRef = React.useRef<number | null>(null);
    const settleTimerRef = React.useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const hasFailureRef = React.useRef(false);

    const clearSettleTimer = React.useCallback(() => {
        if (!settleTimerRef.current) return;
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
    }, []);

    const markUnsaved = React.useCallback(() => {
        if (pendingSavesRef.current > 0) return;
        clearSettleTimer();
        savingStartedAtRef.current = null;
        setStatus("unsaved");
    }, [clearSettleTimer]);

    const finishSaving = React.useCallback((nextStatus: SaveStatus) => {
        const startedAt = savingStartedAtRef.current ?? Date.now();
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, MIN_SAVING_VISIBLE_MS - elapsed);

        clearSettleTimer();

        const settle = () => {
            savingStartedAtRef.current = null;
            settleTimerRef.current = null;
            hasFailureRef.current = false;
            setStatus(nextStatus);
        };

        if (remaining > 0) {
            settleTimerRef.current = window.setTimeout(settle, remaining);
            return;
        }

        settle();
    }, [clearSettleTimer]);

    const runSave = React.useCallback(async <T,>(operation: () => Promise<T>) => {
        if (pendingSavesRef.current === 0) {
            savingStartedAtRef.current = Date.now();
            hasFailureRef.current = false;
        }

        clearSettleTimer();
        pendingSavesRef.current += 1;
        setStatus("saving");

        try {
            const result = await operation();
            pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
            if (pendingSavesRef.current === 0) {
                finishSaving(hasFailureRef.current ? "failed" : "saved");
            }
            return result;
        } catch (error) {
            pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
            hasFailureRef.current = true;
            if (pendingSavesRef.current === 0) finishSaving("failed");
            throw error;
        }
    }, [clearSettleTimer, finishSaving]);

    React.useEffect(() => clearSettleTimer, [clearSettleTimer]);

    return React.useMemo(() => ({
        status,
        markUnsaved,
        runSave,
    }), [markUnsaved, runSave, status]);
};
