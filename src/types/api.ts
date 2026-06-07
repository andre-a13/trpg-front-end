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
