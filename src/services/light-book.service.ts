import {
  lightBooksGet,
  lightBooksListSettings,
  lightBooksSetSettings,
  lightBooksUnlockWord,
  lightWordsCreate,
  lightWordsList,
} from "../api/generated/sdk.gen";
import { apiOptions } from "./api";

export default {
  async get(slug: string, signal?: AbortSignal) {
    return (await lightBooksGet({ ...apiOptions, path: { slug }, signal })).data;
  },
  async listSettings(signal?: AbortSignal) {
    return (await lightBooksListSettings({ ...apiOptions, signal })).data;
  },
  async setSlots(slug: string, slotCount: number) {
    return (await lightBooksSetSettings({ ...apiOptions, path: { slug }, body: { slotCount } })).data;
  },
  async listWords(signal?: AbortSignal) {
    return (await lightWordsList({ ...apiOptions, signal })).data;
  },
  async createWord(name: string, description: string) {
    return (await lightWordsCreate({ ...apiOptions, body: { name, description } })).data;
  },
  async unlockWord(slug: string, wordId: number) {
    await lightBooksUnlockWord({ ...apiOptions, path: { slug, word_id: wordId } });
  },
};
