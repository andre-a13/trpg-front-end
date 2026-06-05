import type { CharacterNoteDto } from "../types/api";
import api from "./api";

type ReorderItem = {
    id: number;
    sortOrder: number;
};

async function createNote(slug: string, body: Pick<CharacterNoteDto, "title"> & Partial<Pick<CharacterNoteDto, "content">>) {
    const res = await api.post<CharacterNoteDto>(`/characters/${slug}/notes`, body);
    return res.data;
}

async function patchNote(slug: string, noteId: number, body: Partial<Pick<CharacterNoteDto, "title" | "content" | "sortOrder">>) {
    const res = await api.patch<CharacterNoteDto>(`/characters/${slug}/notes/${noteId}`, body);
    return res.data;
}

async function deleteNote(slug: string, noteId: number) {
    await api.delete(`/characters/${slug}/notes/${noteId}`);
}

async function reorderNotes(slug: string, items: ReorderItem[]) {
    const res = await api.patch<CharacterNoteDto[]>(`/characters/${slug}/notes/reorder`, { items });
    return res.data;
}

export default {
    createNote,
    patchNote,
    deleteNote,
    reorderNotes,
};
