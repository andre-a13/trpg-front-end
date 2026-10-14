import type { SkillSet } from "./character";

export type UserRole = "admin" | "player";

export type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type AccountDto = AuthUser & {
  owned_character_count: number;
};

export type AccountCreateRequest = {
  username: string;
  password: string;
  role: UserRole;
};

export type AccountUpdateRequest = {
  role?: UserRole;
};

export type TokenPairResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
};

export type CharacterTeamDto = {
  uuid: string;
  name: string;
  illustrationUrl?: string;
};

export type CharacterNoteDto = {
  id: number;
  characterId: number;
  title: string;
  content: string;
  sortOrder: number;
};

export type HearthstomancerStatusDto = {
  configured: boolean;
  enabled: boolean;
};

export type CharacterCreateRequest = {
  name: string;
  slug: string;
  race: string;
  portraitUrl?: string;
  backgroundUrl?: string | null;
  stats: SkillSet;
  skillsPrimary: string[];
  skillsSecondary: string[];
  inventory: string[];
  gold?: number;
  notes?: string;
  current_hp?: number;
  bonusHealth?: number;
  ownerUserId?: number | null;
};

export type InventoryContentDto = {
  id: number;
  categoryId: number;
  name: string;
  quantity: number;
  notes?: string | null;
  sortOrder: number;
};

export type InventoryCategoryDto = {
  id: number;
  characterId: number;
  name: string;
  sortOrder: number;
  contents: InventoryContentDto[];
};

export type CharacterDto = CharacterCreateRequest & {
  id: number;
  ownerUsername?: string | null;
  teams?: CharacterTeamDto[];
  inventoryCategories?: InventoryCategoryDto[];
  noteTabs?: CharacterNoteDto[];
  hearthstomancer?: HearthstomancerStatusDto;
};

export type CharacterUpdateRequest = Partial<CharacterCreateRequest>;

export type TeamCreateRequest = {
  uuid?: string;
  name: string;
  illustrationUrl?: string;
};

export type TeamCharacterDto = {
  id: number;
  slug: string;
  name: string;
  race: string;
  portraitUrl?: string;
  ownerUserId?: number | null;
};

export type TeamDto = TeamCreateRequest & {
  uuid: string;
  characters?: TeamCharacterDto[];
};

export type TeamIllustrationUploadResponse = {
  upload_url: string;
  object_key: string;
  public_url: string;
  expires_in: number;
};

export type HearthstoneCardDto = {
  id: string;
  name: string;
  cost?: number | null;
  attack?: number | null;
  health?: number | null;
  durability?: number | null;
  text: string;
  cardType?: string | null;
  rarity?: string | null;
  cardClass?: string | null;
  tribe?: string | null;
  spellSchool?: string | null;
  cardSet?: string | null;
  cardSetName?: string | null;
  illustrationUrl: string;
  renderUrl: string;
};

export type DeckCardDefinitionDto = Omit<HearthstoneCardDto, "id"> & {
  id: number;
  sourceCardId: string;
  originalIllustrationUrl?: string | null;
  isVariant: boolean;
  normalCount: number;
  goldenCount: number;
  remainingNormalCount: number;
  remainingGoldenCount: number;
};

export type DeckCardCopyDto = {
  copyId: number;
  isGolden: boolean;
  definition: DeckCardDefinitionDto;
};

export type DeckStateDto = {
  configured: true;
  enabled: boolean;
  revision: number;
  permissions: {
    canManage: boolean;
    canActivate: boolean;
  };
  counts: {
    total: number;
    remaining: number;
    drawn: number;
  };
  definitions: DeckCardDefinitionDto[];
  drawnCards: DeckCardCopyDto[];
  undoablePlay?: DeckCardCopyDto | null;
};

export type DeckDefinitionInput = {
  sourceCardId: string;
  name: string;
  cost?: number | null;
  attack?: number | null;
  health?: number | null;
  durability?: number | null;
  text: string;
  cardType?: string | null;
  rarity?: string | null;
  cardClass?: string | null;
  tribe?: string | null;
  spellSchool?: string | null;
  cardSet?: string | null;
  illustrationUrl?: string | null;
  normalCount: number;
  goldenCount: number;
};

export type HearthstoneCatalogPageDto = {
  items: HearthstoneCardDto[];
  sets: HearthstoneCardSetDto[];
  page: number;
  pageSize: number;
  total: number;
};

export type HearthstoneCardSetDto = {
  code: string;
  name: string;
  cardCount: number;
};

export type HearthstonePackDto = {
  cardSet: string;
  cards: HearthstoneCardDto[];
};
