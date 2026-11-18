import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { LightWordResponse } from "../../api/generated/types.gen";

type Props = {
  pageNumber: number;
  words: (LightWordResponse | null)[];
  selectedWordId?: number;
};

export default function LightWordPage({ pageNumber, words, selectedWordId }: Props) {
  const { t } = useTranslation();
  const selectedEntry = useRef<HTMLLIElement>(null);

  useEffect(() => {
    selectedEntry.current?.scrollIntoView?.({ block: "nearest" });
  }, [pageNumber, selectedWordId]);

  return (
    <section
      className="light-catalogue__page"
      aria-label={t("lightBook.catalogue.page", { number: pageNumber })}
      aria-hidden={words.length === 0 ? true : undefined}
    >
      {words.length > 0 && (
        <ol className="light-catalogue__entries">
          {words.map((word, index) => {
            const isSelected = word !== null && word.id === selectedWordId;

            return (
              <li
                key={word?.id ?? `hidden-${index}`}
                ref={isSelected ? selectedEntry : undefined}
                className={`light-catalogue__entry${isSelected ? " light-catalogue__entry--selected" : ""}`}
                aria-current={isSelected ? true : undefined}
              >
                {word ? (
                  <>
                    <strong title={word.name}>{word.name}</strong>
                    {word.description && <p title={word.description}>{word.description}</p>}
                  </>
                ) : (
                  <span className="light-catalogue__hidden-indicator" role="img" aria-label={t("lightBook.catalogue.hiddenWord")}>
                    ???
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <footer className="light-catalogue__page-number" aria-hidden="true">{pageNumber}</footer>
    </section>
  );
}
