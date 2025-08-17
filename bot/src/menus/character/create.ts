import { brBuilder, createContainer, createSeparator } from "@magicyan/discord";
import { InteractionReplyOptions } from "discord.js";
import { CharacterCreationStep, createCharacterData } from "shared/character/create.js";
export interface CharacterCreationData {
    name?: string;
    primaryPosition?: Position;
    secondaryPosition?: Position;
    personalityId?: string;
}



export function characterCreateMenu<R>(step: CharacterCreationStep): R {
    const steps = createCharacterData();
    const data = steps[step];

    const container = createContainer(data.color,
        brBuilder(`${data.emoji} **${data.title}**`,
            data.description,

        ),
        createSeparator(),
        data.row as unknown as import("discord.js").ActionRowBuilder<import("discord.js").MessageActionRowComponentBuilder>

    )
    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container]
    } satisfies InteractionReplyOptions) as R;
}