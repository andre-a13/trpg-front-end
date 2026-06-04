import React from "react";
import { useTranslation } from "react-i18next";
import type { SkillSet } from "../../../types/character";

export interface StatsValues {
    corps: number;
    mental: number;
    social: number;
}

type StatKey = keyof SkillSet;

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? Math.round(n) : 0));

interface RowProps {
    label: string;
    statKey: StatKey;
    value: number;
    editable?: boolean;
    onChange?: (key: StatKey, value: number) => void;
}

const StatRow: React.FC<RowProps> = ({ label, statKey, value, editable = false, onChange }) => {
    const { t } = useTranslation();
    const v = clamp(value);
    const statStyle = { "--stat-value": `${v}%` } as React.CSSProperties;

    return (
        <div className="ccard-stat">
            <div className="ccard-statName">{label}</div>
            {editable ? (
                <input
                    className="ccard-statRange"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={v}
                    style={statStyle}
                    aria-label={t("characterCard.stats.edit", { label })}
                    onChange={(event) => onChange?.(statKey, clamp(Number(event.target.value)))}
                />
            ) : (
                <div className="ccard-bar" aria-hidden="true">
                    <div className="ccard-fill" style={{ width: `${v}%` }} />
                </div>
            )}
            {editable ? (
                <input
                    className="ccard-val ccard-statInput"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={v}
                    aria-label={t("characterCard.stats.value", { label })}
                    onChange={(event) => onChange?.(statKey, clamp(Number(event.target.value)))}
                />
            ) : (
                <output className="ccard-val" aria-label={t("characterCard.stats.value", { label })}>{v}</output>
            )}
        </div>
    );
};

interface StatsProps {
    values: StatsValues;
    editable?: boolean;
    onChange?: (key: StatKey, value: number) => void;
}

export const Stats: React.FC<StatsProps> = ({ values, editable = false, onChange }) => {
    const { t } = useTranslation();
    const total = (values?.corps ?? 0) + (values?.mental ?? 0) + (values?.social ?? 0);
    return (
        <section className="ccard-stats" aria-label={t("characterCard.stats.label", { total })}>
            <StatRow label={t("characterCard.stats.corps")} statKey="corps" value={values.corps} editable={editable} onChange={onChange} />
            <StatRow label={t("characterCard.stats.mental")} statKey="mental" value={values.mental} editable={editable} onChange={onChange} />
            <StatRow label={t("characterCard.stats.social")} statKey="social" value={values.social} editable={editable} onChange={onChange} />
        </section>
    );
};
