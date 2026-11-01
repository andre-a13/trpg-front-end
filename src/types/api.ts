import type { CharacterSummaryResponse, CharacterDetailResponse, UserResponse, DeckDefinitionResponse, HearthstoneCardResponse } from "../api/generated/types.gen";

export type {
  UserResponse as AuthUser,
  AccountResponse as AccountDto,
  AccountCreate as AccountCreateRequest,
  AccountUpdate as AccountUpdateRequest,
  TokenPairResponse,
  CharacterTeamResponse as CharacterTeamDto,
  CharacterNoteResponse as CharacterNoteDto,
  HearthstomancerStatusResponse as HearthstomancerStatusDto,
  CharacterCreate as CharacterCreateRequest,
  CharacterUpdate as CharacterUpdateRequest,
  InventoryContentResponse as InventoryContentDto,
  InventoryCategoryResponse as InventoryCategoryDto,
  TeamCreate as TeamCreateRequest,
  TeamCharacterResponse as TeamCharacterDto,
  TeamResponse as TeamDto,
  TeamIllustrationUploadResponse,
  InventionResponse as InventionDto,
  InventionStateResponse as InventionStateDto,
  HearthstoneCardResponse as HearthstoneCardDto,
  DeckCopyResponse as DeckCardCopyDto,
  DeckStateResponse as DeckStateDto,
  DeckDefinitionInput,
  HearthstoneCatalogResponse as HearthstoneCatalogPageDto,
  HearthstoneSetResponse as HearthstoneCardSetDto,
  HearthstonePackResponse as HearthstonePackDto,
} from "../api/generated/types.gen";

export type UserRole = UserResponse["role"];
// Display data may be enriched with a catalogue label absent from deck responses.
export type DeckCardDefinitionDto = DeckDefinitionResponse & Partial<Pick<HearthstoneCardResponse, "cardSetName">>;
export type CharacterDto = CharacterSummaryResponse & Partial<Pick<CharacterDetailResponse, "inventoryCategories" | "noteTabs">>;
