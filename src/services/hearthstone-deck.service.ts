import type {
  DeckDefinitionInput,
  DeckStateDto,
  HearthstoneCatalogPageDto,
  HearthstonePackDto,
} from "../types/api";
import api from "./api";

async function searchCards(query: string, page = 1, pageSize = 24, cardSet = "") {
  const response = await api.get<HearthstoneCatalogPageDto>("/hearthstone/cards", {
    params: { q: query, page, pageSize, ...(cardSet ? { cardSet } : {}) },
  });
  return response.data;
}

async function setEnabled(slug: string, enabled: boolean) {
  const response = await api.patch<DeckStateDto | { configured: false; enabled: false }>(
    `/characters/${slug}/hearthstomancer`,
    { enabled },
  );
  return response.data;
}

async function getDeck(slug: string) {
  const response = await api.get<DeckStateDto>(`/characters/${slug}/deck`);
  return response.data;
}

async function saveComposition(slug: string, definitions: DeckDefinitionInput[]) {
  const response = await api.put<DeckStateDto>(`/characters/${slug}/deck/composition`, { definitions });
  return response.data;
}

async function openPack(slug: string, cardSet: string) {
  const response = await api.post<HearthstonePackDto>(`/characters/${slug}/deck/pack/open`, { cardSet });
  return response.data;
}

async function savePack(slug: string, sourceCardIds: string[]) {
  const response = await api.post<DeckStateDto>(`/characters/${slug}/deck/pack/save`, { sourceCardIds });
  return response.data;
}

async function draw(slug: string) {
  const response = await api.post<DeckStateDto>(`/characters/${slug}/deck/draw`);
  return response.data;
}

async function discard(slug: string, copyId: number) {
  const response = await api.post<DeckStateDto>(`/characters/${slug}/deck/copies/${copyId}/discard`);
  return response.data;
}

async function play(slug: string, copyId: number) {
  const response = await api.post<DeckStateDto>(`/characters/${slug}/deck/copies/${copyId}/play`);
  return response.data;
}

async function undoPlay(slug: string) {
  const response = await api.post<DeckStateDto>(`/characters/${slug}/deck/undo-play`);
  return response.data;
}

async function remove(
  slug: string,
  body: {
    zone: "deck";
    definitionId: number;
    isGolden: boolean;
  },
) {
  const response = await api.post<DeckStateDto>(`/characters/${slug}/deck/remove`, body);
  return response.data;
}

async function reset(slug: string) {
  const response = await api.post<DeckStateDto>(`/characters/${slug}/deck/reset`);
  return response.data;
}

export default {
  searchCards,
  setEnabled,
  getDeck,
  saveComposition,
  openPack,
  savePack,
  draw,
  discard,
  play,
  undoPlay,
  remove,
  reset,
};
