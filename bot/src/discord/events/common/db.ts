import { createEvent } from "#base";
import { prisma } from "#database";

createEvent({
    name: "db",
    event: "guildCreate",
    async run(guild) {
        await prisma.guild.upsert({
            create: {
                id: guild.id,
            },
            where: {
                id: guild.id
            },
            update: {}
        })
    },

});


createEvent({
    name: "db",
    event: "interactionCreate",
    once: true,
    async run(guild) {
        await prisma.guild.upsert({
            create: {
                id: guild.id,
            },
            where: {
                id: guild.id
            },
            update: {}
        })
    }

});