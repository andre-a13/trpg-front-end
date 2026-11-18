import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { LightBookResponse } from "../../api/generated/types.gen";
import { withOrigin } from "../navigation/navigationPaths";
import "../character-card/inventory/inventory-item/inventory-item.scss";
import "./light-book.scss";

export default function LightBookModule({ book, sheetHref }: { book: LightBookResponse; sheetHref: string }) {
  const { t } = useTranslation();

  if (book.words.length === 0) {
    return <p className="ccard-emptyState">{t("lightBook.noKnownWords")}</p>;
  }

  return (
    <ul className="ccard-list" role="list" aria-label={t("lightBook.knownWords")}>
      {book.words.map((word) => (
        <li key={word.id}>
          <Link
            className="ccard-invItem light-book__word-link"
            to={withOrigin(`/light-words?word=${word.id}`, sheetHref)}
            title={word.description || undefined}
          >
            <span className="ccard-itemLabel">{word.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
