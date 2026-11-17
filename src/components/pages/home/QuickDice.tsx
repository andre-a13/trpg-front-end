import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dices, RotateCcw } from "lucide-react";

function rollDie(sides: number) {
  const limit = Math.floor(2 ** 32 / sides) * sides;
  const bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return bytes[0] % sides + 1;
}

export default function QuickDice() {
  const { t } = useTranslation();
  const [sides, setSides] = useState(20);
  const [rolls, setRolls] = useState<{ count: number; history: { id: number; value: number }[] }>({ count: 0, history: [] });
  const result = rolls.history[0]?.value;

  function clear() { setRolls((previous) => ({ ...previous, history: [] })); }
  function roll() {
    const value = rollDie(sides);
    setRolls((previous) => ({ count: previous.count + 1, history: [{ id: previous.count + 1, value }, ...previous.history].slice(0, 5) }));
  }

  return (
    <section className="home-dice" aria-labelledby="home-dice-title">
      <div className="home-dice__eyebrow">{t("home.dice.eyebrow")}</div>
      <h2 id="home-dice-title">{t("home.dice.title")}</h2>
      <p>{t("home.dice.intro")}</p>
      <div className="home-dice__choices" role="group" aria-label={t("home.dice.choose")}>
        {[6, 20, 100].map((die) => <button type="button" className="home-dice__choice" key={die} aria-pressed={sides === die} onClick={() => { if (sides !== die) { setSides(die); clear(); } }}>D{die}</button>)}
      </div>
      <div className="home-dice__result">
        <div role="status" aria-live="polite" aria-atomic="true">
          <strong className="home-dice__number" aria-hidden="true">{result ?? "—"}</strong>
          <small className="home-dice__label" aria-hidden="true">D{sides}</small>
          <span className="sr-only">{result === undefined ? t("home.dice.ready") : t("home.dice.result", { result, sides, roll: rolls.count })}</span>
        </div>
      </div>
      <button className="home-dice__roll" type="button" onClick={roll}><Dices size={18} aria-hidden="true" />{t("home.dice.roll")}</button>
      <div className="home-dice__history">
        <ol aria-label={t("home.dice.history")}>{rolls.history.map((item) => <li key={item.id}>{item.value}</li>)}</ol>
        {rolls.history.length > 0 && <button className="home-dice__clear" type="button" onClick={clear}><RotateCcw size={13} aria-hidden="true" />{t("home.dice.clear")}</button>}
      </div>
    </section>
  );
}
