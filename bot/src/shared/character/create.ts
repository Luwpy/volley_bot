import { StringSelectMenuBuilder } from "@discordjs/builders";
import { createRow } from "@magicyan/discord";
import { ButtonBuilder, ButtonStyle } from "discord.js";


export type CharacterCreationStep = 'name' | 'position' | 'secondaryPosition' | 'personality' | 'confirm';

export interface CharacterCreationState {
    label: string;
    title: string;
    description: string;
    color: string;
    emoji: string | { id: string };
    row: ReturnType<typeof createRow>;
}

const positionOptions = [
    { label: "Wing Spiker", value: "WS", emoji: "🏐" },
    { label: "Setter", value: "SE", emoji: "🎯" },
    { label: "Middle Blocker", value: "MB", emoji: "🛡️" },
    { label: "Libero", value: "LB", emoji: "🦺" },
    { label: "Outside Hitter", value: "OH", emoji: "🚀" }
];

// Helper to get secondary options excluding the primary
export function getSecondaryPositionOptions(primaryValue: string) {
    return positionOptions.filter(option => option.value !== primaryValue);
}

export function createCharacterData(primaryPosition?: string): Record<CharacterCreationStep, CharacterCreationState> {
    return {
        name: {
            label: "Name",
            title: "Character Name",
            description: "Choose a name for your character.",
            color: constants.colors.azoxo,
            emoji: "📝",
            row: createRow(
                new ButtonBuilder({
                    customId: "character/create/name",
                    label: "Name",
                    style: ButtonStyle.Primary
                })
            )
        },
        position: {
            label: "Position",
            title: "Character Position",
            description: "Choose a position for your character.",
            color: constants.colors.azoxo,
            emoji: "📍",
            row: createRow(
                new StringSelectMenuBuilder({
                    custom_id: "character/create/position/primary",
                    placeholder: "Select a position",
                    options: positionOptions.map(option => ({
                        label: option.label,
                        value: option.value,
                        emoji: option.emoji ? { name: option.emoji } : undefined
                    }))
                })
            )
        },
        secondaryPosition: {
            label: "Secondary Position",
            title: "Secondary Character Position",
            description: "Choose a secondary position for your character.",
            color: constants.colors.azoxo,
            emoji: "🔄",
            row: createRow(
                new StringSelectMenuBuilder({
                    custom_id: "character/create/position/secondary",
                    placeholder: "Select a secondary position",
                    options: getSecondaryPositionOptions(primaryPosition ?? "").map(option => ({
                        label: option.label,
                        value: option.value,
                        emoji: option.emoji ? { name: option.emoji } : undefined
                    }))
                })
            )
        },
        personality: {
            label: "Personality",
            title: "Character Personality",
            description: "Choose a personality for your character.",
            color: constants.colors.azoxo,
            emoji: "😃",
            row: createRow(
                new ButtonBuilder({
                    customId: "character/create/personality",
                    label: "Personality",
                    style: ButtonStyle.Primary
                })
            )
        },
        confirm: {
            label: "Confirm",
            title: "Confirm Character",
            description: "Confirm your character creation.",
            color: constants.colors.azoxo,
            emoji: "✅",
            row: createRow(
                new ButtonBuilder({
                    customId: "character/create/confirm",
                    label: "Confirm",
                    style: ButtonStyle.Success
                })
            )
        }
    };
}
