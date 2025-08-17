import { menus } from "#menus";
import character from "./character.js";

character.subcommand({
    name: "create",
    description: "Character creation subcommand",
    async run(interaction, data) {

        interaction.reply(menus.character.create("name"))

    },
})