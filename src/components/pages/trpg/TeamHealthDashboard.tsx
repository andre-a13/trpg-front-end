import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { characterPath } from "../../navigation/navigationPaths";
import "./team-health-dashboard.scss";

export interface TeamHealthMember {
  slug: string;
  name: string;
  race: string;
  portraitUrl: string | null;
  currentHp: number;
  maxHp: number;
  canEdit: boolean;
  isSaving: boolean;
  error: string | null;
}

interface Props {
  members: TeamHealthMember[];
  teamHref: string;
  onAdjustHp: (slug: string, delta: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function healthState(current: number, max: number) {
  if (current <= 0) return "down";
  if (current <= max / 2) return "critical";
  if (current < max) return "wounded";
  return "healthy";
}

export default function TeamHealthDashboard({ members, teamHref, onAdjustHp, onRefresh, refreshing }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const totalCurrent = members.reduce((sum, member) => sum + member.currentHp, 0);
  const totalMax = members.reduce((sum, member) => sum + member.maxHp, 0);
  const wounded = members.filter((member) => member.currentHp > 0 && member.currentHp < member.maxHp).length;
  const down = members.filter((member) => member.currentHp <= 0).length;

  return (
    <section className="team-health" aria-labelledby={`${id}-title`}>
      <header className="team-health__header">
        <div>
          <h2 id={`${id}-title`}>{t("teamHealth.title")}</h2>
          <p className="team-health__hint">{t("teamHealth.hint")}</p>
        </div>
        <button className="team-health__refresh" type="button" onClick={onRefresh}
          disabled={refreshing}>
          {t("teamHealth.refresh")}
        </button>
      </header>

      <div className="team-health__summary">
        <span>{t("teamHealth.total", { current: totalCurrent, max: totalMax })}</span>
        <span className="team-health__summary-wounded">{t("teamHealth.woundedCount", { count: wounded })}</span>
        <span className="team-health__summary-down">{t("teamHealth.downCount", { count: down })}</span>
      </div>

      <div className="team-health__grid">
        {members.map((member) => {
          const state = healthState(member.currentHp, member.maxHp);
          const boundedHp = Math.max(0, Math.min(member.currentHp, member.maxHp));
          const progress = member.maxHp > 0 ? (boundedHp / member.maxHp) * 100 : 0;
          const amountText = amounts[member.slug] ?? "1";
          const amount = Number(amountText);
          const validAmount = amountText.trim() !== "" && Number.isInteger(amount) && amount >= 1 && amount <= 9999;
          const initials = member.name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
            .map((part) => part[0]).join("").toUpperCase() || "?";

          return (
            <article className={`team-health__card team-health__card--${state}`} key={member.slug} aria-label={member.name} aria-busy={member.isSaving}>
              <div className="team-health__identity">
                <span className="team-health__avatar" aria-hidden="true">
                  {initials}
                  {member.portraitUrl && <img src={member.portraitUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
                </span>
                <div>
                  <h3><Link to={characterPath(member.slug, teamHref)}>{member.name}</Link></h3>
                  <span className="team-health__race">{member.race}</span>
                </div>
              </div>

              <div className="team-health__vitals">
                <span className="team-health__value"><strong>{member.currentHp}</strong><span> / {member.maxHp} {t("teamHealth.hp")}</span></span>
                <span className="team-health__state">{t(`teamHealth.state.${state}`)}</span>
              </div>
              <div className="team-health__progress" role="progressbar" aria-label={t("teamHealth.progress", { name: member.name })}
                aria-valuemin={0} aria-valuemax={member.maxHp} aria-valuenow={boundedHp}>
                <span style={{ width: `${progress}%` }} />
              </div>

              {member.canEdit ? (
                <div className="team-health__controls">
                  <div className="team-health__quick">
                    {[-5, -1, 1, 5].map((delta) => (
                      <button key={delta} type="button" className={delta < 0 ? "team-health__damage" : "team-health__heal"}
                        disabled={refreshing || (delta < 0 ? member.currentHp <= 0 : member.currentHp >= member.maxHp)}
                        aria-label={t(delta < 0 ? "teamHealth.decrease" : "teamHealth.increase", { amount: Math.abs(delta), name: member.name })}
                        onClick={() => onAdjustHp(member.slug, delta)}>
                        {delta > 0 ? "+" : "−"}{Math.abs(delta)}
                      </button>
                    ))}
                  </div>
                  <div className="team-health__custom">
                    <label htmlFor={`${id}-${member.slug}-amount`} className="team-health__amount-label">{t("teamHealth.amountLabel")}</label>
                    <input id={`${id}-${member.slug}-amount`} type="number" min={1} max={9999} step={1}
                      aria-label={t("teamHealth.amount", { name: member.name })} value={amountText} disabled={refreshing}
                      onChange={(event) => setAmounts((previous) => ({ ...previous, [member.slug]: event.target.value }))} />
                    <button className="team-health__damage" type="button" disabled={refreshing || !validAmount || member.currentHp <= 0}
                      onClick={() => onAdjustHp(member.slug, -amount)}>{t("teamHealth.damage")}</button>
                    <button className="team-health__heal" type="button" disabled={refreshing || !validAmount || member.currentHp >= member.maxHp}
                      onClick={() => onAdjustHp(member.slug, amount)}>{t("teamHealth.heal")}</button>
                  </div>
                </div>
              ) : <p className="team-health__read-only">{t("teamHealth.readOnly")}</p>}

              <div className="team-health__feedback">
                {member.error && <p role="alert">{member.error}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
