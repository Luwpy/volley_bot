import { prisma } from "#database";

async function verifyMemberLimit(memberId: string, maxCharacters = 3) {
  const count = await prisma.character.count({ where: { memberId } });

  if (count >= maxCharacters) {
    throw new Error("Limite de personagens atingido.");
  }

  
}


import { Character, Position, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type CreateCharacterInput = {
  memberId: string
  name: string
  primaryPosition: Position
  personalityId: string
}

export async function createPlayerCharacter(input: CreateCharacterInput): Promise<Character> {
  const { memberId, name, primaryPosition, personalityId } = input;

  const height = generateHeightForPosition(primaryPosition);
  const baseStats = generateBaseStats();

  const character = await prisma.character.create({
    data: {
      name,
      level: 1,
      experience: 0,
      height,
      energy: 100,
      motivation: 100,
      primaryPosition,
      secondaryPosition: null,
      memberId,
      personalityId,
      ...baseStats
    }
  });

  return character;
}



function generateHeightForPosition(position: Position): number {
  const baseHeights: Record<Position, number> = {
    WS: 185,
    MB: 190,
    OH: 183,
    Se: 178,
    LB: 175
  };

  const base = baseHeights[position] ?? 180;
  const variation = Math.floor(Math.random() * 7) - 3; // ±3 cm

  return Math.max(165, Math.min(195, base + variation));
}
