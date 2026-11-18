import { useEffect, useState } from "react";
import type { LightBookResponse } from "../../api/generated/types.gen";
import lightBookService from "../../services/light-book.service";

type BookResult = {
  slug: string;
  viewerId: number;
  attempt: number;
  book: LightBookResponse | null;
};

export default function useCharacterLightBook(slug: string | null, viewerId: number | null) {
  const [result, setResult] = useState<BookResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug || viewerId === null) return;

    let controller: AbortController | undefined;
    const read = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const book = await lightBookService.get(slug, request.signal).catch(() => null);
      if (!request.signal.aborted) setResult({ slug, viewerId, attempt, book });
    };

    const refresh = () => { void read(); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [slug, viewerId, attempt]);

  const current = result?.slug === slug && result.viewerId === viewerId && result.attempt === attempt ? result : null;
  const book = current?.book;
  const hasAccess = book && book.slotCount !== null && (book.slotCount > 0 || book.words.length > 0);

  return {
    book: hasAccess ? book : null,
    retry: current?.book === null ? () => setAttempt((count) => count + 1) : undefined,
  };
}
