import type { CharacterUpdate, CharacterDetailResponse, InventionCreate } from "../../src/api/generated/types.gen";

const partialStats: CharacterUpdate = { stats: { corps: 65 } };
void partialStats;

// @ts-expect-error Generated input must reject a non-string invention name.
const invalidName: InventionCreate = { name: 42 };
void invalidName;

// @ts-expect-error A detail response must include its required expanded fields.
const incompleteDetail: CharacterDetailResponse = {};
void incompleteDetail;
