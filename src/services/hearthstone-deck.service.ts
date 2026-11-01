import { hearthstoneCardsList, decksSetEnabled, decksGet, decksReplaceComposition,
  decksOpenPack, decksSavePack, decksDraw, decksDiscard, decksPlay, decksUndoPlay,
  decksRemoveCopy, decksReset } from "../api/generated/sdk.gen";
import type { DeckDefinitionInput, DeckPackSaveRequest, DeckRemoveRequest } from "../api/generated/types.gen";
import { apiOptions } from "./api";

async function searchCards(q: string, page = 1, pageSize = 24, cardSet = "") {
  return (await hearthstoneCardsList({ ...apiOptions, query: { q, page, pageSize, ...(cardSet ? { cardSet } : {}) } })).data;
}
async function setEnabled(slug: string, enabled: boolean) {
  return (await decksSetEnabled({ ...apiOptions, path: { slug }, body: { enabled } })).data;
}
async function getDeck(slug: string) {
  return (await decksGet({ ...apiOptions, path: { slug } })).data;
}
async function saveComposition(slug: string, definitions: DeckDefinitionInput[]) {
  return (await decksReplaceComposition({ ...apiOptions, path: { slug }, body: { definitions } })).data;
}
async function openPack(slug: string, cardSet: string) {
  return (await decksOpenPack({ ...apiOptions, path: { slug }, body: { cardSet } })).data;
}
async function savePack(slug: string, sourceCardIds: string[]) {
  // The pack UI keeps an array; the API retains validation of the five-card tuple.
  return (await decksSavePack({ ...apiOptions, path: { slug }, body: {
    sourceCardIds: sourceCardIds as DeckPackSaveRequest["sourceCardIds"],
  } })).data;
}
async function draw(slug: string) {
  return (await decksDraw({ ...apiOptions, path: { slug } })).data;
}
async function discard(slug: string, copyId: number) {
  return (await decksDiscard({ ...apiOptions, path: { slug, copy_id: copyId } })).data;
}
async function play(slug: string, copyId: number) {
  return (await decksPlay({ ...apiOptions, path: { slug, copy_id: copyId } })).data;
}
async function undoPlay(slug: string) {
  return (await decksUndoPlay({ ...apiOptions, path: { slug } })).data;
}
async function remove(slug: string, body: DeckRemoveRequest) {
  return (await decksRemoveCopy({ ...apiOptions, path: { slug }, body })).data;
}
async function reset(slug: string) {
  return (await decksReset({ ...apiOptions, path: { slug } })).data;
}
export default { searchCards, setEnabled, getDeck, saveComposition, openPack, savePack,
  draw, discard, play, undoPlay, remove, reset };
