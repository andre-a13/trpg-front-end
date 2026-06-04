import React from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "failed";

export type SaveStatusReporter = {
    markUnsaved: () => void;
    runSave: <T>(operation: () => Promise<T>) => Promise<T>;
};

export const useSaveStatus = () => {
    const [status, setStatus] = React.useState<SaveStatus>("saved");
    const pendingSavesRef = React.useRef(0);

    const markUnsaved = React.useCallback(() => {
        setStatus((currentStatus) => currentStatus === "saving" ? currentStatus : "unsaved");
    }, []);

    const runSave = React.useCallback(async <T,>(operation: () => Promise<T>) => {
        pendingSavesRef.current += 1;
        setStatus("saving");

        try {
            const result = await operation();
            pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
            if (pendingSavesRef.current === 0) setStatus("saved");
            return result;
        } catch (error) {
            pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
            setStatus("failed");
            throw error;
        }
    }, []);

    return React.useMemo(() => ({
        status,
        markUnsaved,
        runSave,
    }), [markUnsaved, runSave, status]);
};
