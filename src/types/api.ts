import type { CharacterSummaryResponse, CharacterDetailResponse, UserResponse } from "../api/generated/types.gen";

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
  DeckDefinitionResponse as DeckCardDefinitionDto,
  DeckCopyResponse as DeckCardCopyDto,
  DeckStateResponse as DeckStateDto,
  DeckDefinitionInput,
  HearthstoneCatalogResponse as HearthstoneCatalogPageDto,
  HearthstoneSetResponse as HearthstoneCardSetDto,
  HearthstonePackResponse as HearthstonePackDto,
} from "../api/generated/types.gen";

export type UserRole = UserResponse["role"];
export type CharacterDto = CharacterSummaryResponse & Partial<Pick<CharacterDetailResponse, "inventoryCategories" | "noteTabs">>;
