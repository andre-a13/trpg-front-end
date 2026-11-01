import type { SkillSet } from "../api/generated/types.gen";
export type { SkillSet };

export interface Character {
    name: string;
    race: string;
    portraitUrl?: string;
    stats: SkillSet;
    skillsPrimary: string[]; // 2 éléments
    skillsSecondary: string[]; // 0–3 éléments
    inventory : string[];
    bonusHealth?: number;
}
