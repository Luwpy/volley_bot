import { Position } from "@prisma/client";
import { type InteractionReplyOptions } from "discord.js";

type createCharacterInput = {
    memberId: string
    name: string
    primaryPosition: Position
    personalityId: string 
}

export function characterCreateMenu<R>(): R {
    

    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container]
    } satisfies InteractionReplyOptions) as R;
}