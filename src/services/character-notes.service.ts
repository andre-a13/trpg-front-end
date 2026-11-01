import { characterNotesCreate, characterNotesUpdate, characterNotesDelete, characterNotesReorder } from "../api/generated/sdk.gen";
import type { CharacterNoteCreate, CharacterNoteUpdate, ReorderEntry } from "../api/generated/types.gen";
import { apiOptions } from "./api";

async function createNote(slug: string, body: CharacterNoteCreate) {
    return (await characterNotesCreate({ ...apiOptions, path: { slug }, body })).data;
}
async function patchNote(slug: string, noteId: number, body: CharacterNoteUpdate) {
    return (await characterNotesUpdate({ ...apiOptions, path: { slug, note_id: noteId }, body })).data;
}
async function deleteNote(slug: string, noteId: number) {
    await characterNotesDelete({ ...apiOptions, path: { slug, note_id: noteId } });
}
async function reorderNotes(slug: string, items: ReorderEntry[]) {
    return (await characterNotesReorder({ ...apiOptions, path: { slug }, body: { items } })).data;
}
export default { createNote, patchNote, deleteNote, reorderNotes };
