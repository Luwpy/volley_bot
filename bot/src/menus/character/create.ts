import { createContainer } from "@magicyan/discord";
import { InteractionReplyOptions } from "discord.js";
import { CharacterCreationState } from "shared/character/create.js";
export interface CharacterCreationData {
    name?: string;
    primaryPosition?: Position;
    secondaryPosition?: Position;
    personalityId?: string;
}



export function characterCreateMenu<R>(state: CharacterCreationState = { step: 'name' }): R {

    const container = createContainer(constants.colors.azoxo,

    )
    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container]
    } satisfies InteractionReplyOptions) as R;
}