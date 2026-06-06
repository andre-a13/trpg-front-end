import type { SkillSet } from "../types/character";
import type { CharacterDto, CharacterNoteDto, CharacterTeamDto, InventoryCategoryDto } from "../interface/IAddCharacter";

export default class Character {
    id: number;
    name: string;
    slug: string;
    stats: SkillSet;
    race : string;
    skillsPrimary: string[];
    skillsSecondary: string[];
    portraitUrl?: string;
    backgroundUrl?: string | null;
    inventory: string[];
    gold : number = 0;
    notes : string = "";
    current_hp : number = 0;
    bonusHealth : number = 0;
    ownerUserId?: number | null;
    ownerUsername?: string | null;
    teams: CharacterTeamDto[] = [];
    inventoryCategories: InventoryCategoryDto[] = [];
    noteTabs: CharacterNoteDto[] = [];
    constructor(data: CharacterDto) {
        this.id = data.id;
        this.name = data.name;
        this.slug = data.slug;
        this.race = data.race;
        this.stats = data.stats;
        this.skillsPrimary = data.skillsPrimary;
        this.skillsSecondary = data.skillsSecondary;
        this.inventory = data.inventory;
        this.gold = data.gold ?? 0;
        this.portraitUrl = data.portraitUrl;
        this.backgroundUrl = data.backgroundUrl;
        this.noteTabs = [...(data.noteTabs ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
        this.notes = data.notes ?? this.noteTabs[0]?.content ?? "";
        this.bonusHealth = data.bonusHealth ?? 0;
        this.current_hp = data.current_hp ?? this.getMaxHp();
        this.ownerUserId = data.ownerUserId ?? null;
        this.ownerUsername = data.ownerUsername ?? null;
        this.teams = data.teams ?? [];
        this.inventoryCategories = data.inventoryCategories ?? [];

    }

    getMaxHp(): number {
        return Math.round((this.stats.corps / 5 ) + 5 + this.bonusHealth)
    }

    increaseHp(amount: number = 1) {
        this.current_hp = Math.min(this.current_hp + amount, this.getMaxHp());
    }
    decreaseHp(amount: number = 1) {
        this.current_hp = Math.max(this.current_hp - amount, 0);
    }
    
}
