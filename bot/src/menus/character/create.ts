import { type InteractionReplyOptions } from "discord.js";

export function characterCreateMenu<R>(): R {
    

    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container]
    } satisfies InteractionReplyOptions) as R;
}