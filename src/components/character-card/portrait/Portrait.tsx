import React from "react";
import { ImageUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PortraitProps {
    src?: string;
    alt?: string;
    editable?: boolean;
    uploading?: boolean;
    error?: string | null;
    onUpload?: (file: File) => void;
}

const hasDraggedFiles = (event: React.DragEvent<HTMLElement>) => {
    return Array.from(event.dataTransfer.types).includes("Files");
};

export const Portrait: React.FC<PortraitProps> = ({
    src,
    alt,
    editable = false,
    uploading = false,
    error,
    onUpload,
}) => {
    const { t } = useTranslation();
    const imageAlt = alt ?? t("characterCard.portrait.alt");
    const [isDraggingFile, setIsDraggingFile] = React.useState(false);
    const dragDepthRef = React.useRef(0);
    const canDropPortrait = editable && Boolean(onUpload) && !uploading;

    React.useEffect(() => {
        if (canDropPortrait) return;
        dragDepthRef.current = 0;
        setIsDraggingFile(false);
    }, [canDropPortrait]);

    const startDragVisual = (event: React.DragEvent<HTMLElement>) => {
        if (!canDropPortrait || !hasDraggedFiles(event)) return;
        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDraggingFile(true);
    };

    const keepDragVisual = (event: React.DragEvent<HTMLElement>) => {
        if (!canDropPortrait || !hasDraggedFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setIsDraggingFile(true);
    };

    const stopDragVisual = (event: React.DragEvent<HTMLElement>) => {
        if (!canDropPortrait) return;
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDraggingFile(false);
    };

    const dropPortrait = (event: React.DragEvent<HTMLElement>) => {
        if (!canDropPortrait || !hasDraggedFiles(event)) return;
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDraggingFile(false);

        const file = event.dataTransfer.files?.[0];
        if (file) onUpload?.(file);
    };

    return (
        <figure
            className={`ccard-portrait ${editable ? "is-editable" : ""} ${isDraggingFile ? "is-dragging-file" : ""}`}
            aria-label={t("characterCard.portrait.label")}
            aria-busy={uploading}
            onDragEnter={startDragVisual}
            onDragOver={keepDragVisual}
            onDragLeave={stopDragVisual}
            onDrop={dropPortrait}
        >
            {isDraggingFile ? (
                <div className="ccard-portraitDrop" aria-live="polite">
                    <ImageUp size={24} aria-hidden="true" />
                    <strong>{t("characterCard.portrait.dropTitle")}</strong>
                    <ul>
                        <li>{t("characterCard.portrait.formats")}</li>
                        <li>{t("characterCard.portrait.maxSize")}</li>
                        <li>{t("characterCard.portrait.recommendedRatio")}</li>
                    </ul>
                </div>
            ) : src ? (
                <img src={src} alt={imageAlt} />
            ) : (
                <div className="ccard-hint">{t("characterCard.portrait.hint")}<br />{t("characterCard.portrait.hintDetail")}</div>
            )}

            {uploading && !isDraggingFile ? (
                <figcaption className="ccard-portraitStatus" aria-live="polite">
                    {t("characterCard.portrait.uploading")}
                </figcaption>
            ) : null}

            {error && !isDraggingFile ? (
                <figcaption className="ccard-portraitError" role="alert">
                    {error}
                </figcaption>
            ) : null}
        </figure>
    );
};
