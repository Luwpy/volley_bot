import { brBuilder, createContainer, createRow } from "@magicyan/discord";
import { ButtonBuilder, ButtonStyle, type InteractionReplyOptions } from "discord.js";

export function characterMainMenu<R>(): R {
    const container = createContainer(constants.colors.azoxo,
        brBuilder(
            "## Main menu"
        ),
        createRow(
            new ButtonBuilder({
                customId: "menu/action",
                label: ">",
                style: ButtonStyle.Success
            })
        )
    );

    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container]
    } satisfies InteractionReplyOptions) as R;
}