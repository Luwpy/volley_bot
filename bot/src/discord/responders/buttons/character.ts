import { createResponder, ResponderType } from "#base";

createResponder({
    customId: "character/create/:action",
    types: [ResponderType.Button], cache: "cached",
    async run(interaction, { action }) {
        interaction.deferUpdate();
        // Handle the button interaction here
        // You can access interaction.customId to determine which button was pressed
        // and perform the appropriate action
        switch (action) {
            case "name":
                interaction.showModal({
                    title: "Character Name",
                    customId: "character/create/name",
                    components: [
                        {
                            type: 1,
                            components: [
                                {
                                    type: 4,
                                    customId: "characterName",
                                    label: "Enter your character's name",
                                    style: 1,
                                    minLength: 1,
                                    maxLength: 30,
                                    placeholder: "Character Name",
                                    required: true
                                }
                            ]
                        }
                    ]
                })
                break;
            case "position":
                console.log(`Button with customId ${interaction.customId} was pressed.`);
                break;
            case "secondaryPosition":
                console.log(`Button with customId ${interaction.customId} was pressed.`);
                break;
            case "personality":
                console.log(`Button with customId ${interaction.customId} was pressed.`);
                break;
            case "confirm":
                console.log(`Button with customId ${interaction.customId} was pressed.`);
                break;
        }
    }

},
);