// src/functions/services/characterService.ts
import { prisma } from "#database";
import { Character, Position, Prisma, TrainingType } from "@prisma/client";
import {
    calculateExpRequired,
    calculateStatGain,
    calculateTrainingCost,
    canTrainAt,
    GAME_CONSTANTS,
    getPositionBonus,
    TRAINING_TYPES,
    type StatName
} from "../utils/gameUtils.js";

export interface CharacterCreateData {
    name: string;
    personalityId: string;
    memberId: string;
    guildId: string;
    primaryPosition: Position;
    secondaryPosition?: Position;
}

export interface TrainingSession {
    characterId: string;
    trainingType: TrainingType;
    duration: number; // in minutes
    intensity: number; // 1-5
}

export interface TrainingResult {
    success: boolean;
    message: string;
    statsGained?: Record<string, number>;
    experienceGained?: number;
    energyUsed?: number;
    motivationUsed?: number;
}

export class CharacterService {

    /**
     * Create a new character
     */
    static async createCharacter(data: CharacterCreateData): Promise<Character> {
        // Verify the member exists
        const member = await prisma.member.findUnique({
            where: {
                id_guildId: {
                    id: data.memberId,
                    guildId: data.guildId
                }
            }
        });

        if (!member) {
            throw new Error("Member not found");
        }

        // Check if personality exists
        const personality = await prisma.personality.findUnique({
            where: { id: data.personalityId }
        });

        if (!personality) {
            throw new Error("Personality not found");
        }

        // Create character with base stats
        return await prisma.character.create({
            data: {
                name: data.name,
                primaryPosition: data.primaryPosition,
                secondaryPosition: data.secondaryPosition,
                personalityId: data.personalityId,
                memberId: data.memberId,
                // Base stats are set by Prisma defaults
            },
            include: {
                personality: true,
                Member: true,
                items: {
                    include: {
                        item: true
                    }
                },
                learnedTechniques: {
                    include: {
                        technique: true
                    }
                }
            }
        });
    }

    /**
     * Get character with full details
     */
    static async getCharacterDetails(characterId: string) {
        return await prisma.character.findUnique({
            where: { id: characterId },
            include: {
                personality: true,
                Member: true,
                items: {
                    include: {
                        item: true
                    }
                },
                learnedTechniques: {
                    include: {
                        technique: true
                    }
                },
                trainingRecords: {
                    orderBy: { completedAt: 'desc' },
                    take: 10
                },
                matchStats: {
                    include: {
                        match: true
                    },
                    orderBy: { match: { finishedAt: 'desc' } },
                    take: 5
                },
                teamMemberships: {
                    include: {
                        team: true
                    },
                    where: {
                        team: {
                            isActive: true
                        }
                    }
                }
            }
        });
    }

    /**
     * Train a character
     */
    static async trainCharacter(session: TrainingSession): Promise<TrainingResult> {
        const character = await prisma.character.findUnique({
            where: { id: session.characterId }
        });

        if (!character) {
            return {
                success: false,
                message: "Character not found"
            };
        }

        const trainingData = TRAINING_TYPES[session.trainingType];
        const costs = calculateTrainingCost(session.trainingType, session.intensity);

        // Check if character can train
        if (!canTrainAt(character.energy, character.motivation, session.trainingType, session.intensity)) {
            return {
                success: false,
                message: `Not enough energy (${costs.energy}) or motivation (${costs.motivation}) to train`
            };
        }

        // Calculate gains
        const statsGained: Record<string, number> = {};
        let experienceGained = 0;

        // Primary stat gain
        if (trainingData.primaryStat) {
            const baseGain = calculateStatGain(GAME_CONSTANTS.TRAINING_STAT_GAIN_BASE, session.intensity, character.level);
            const positionBonus = getPositionBonus(character.primaryPosition, trainingData.primaryStat as StatName);
            const finalGain = Math.floor(baseGain * positionBonus);

            statsGained[`${trainingData.primaryStat}Gain`] = finalGain;
            experienceGained += finalGain * 5;
        }

        // Secondary stats gain
        for (const secondaryStat of trainingData.secondaryStats) {
            const baseGain = Math.floor(calculateStatGain(GAME_CONSTANTS.TRAINING_STAT_GAIN_BASE, session.intensity, character.level) * 0.6);
            const positionBonus = getPositionBonus(character.primaryPosition, secondaryStat as StatName);
            const finalGain = Math.floor(baseGain * positionBonus);

            statsGained[`${secondaryStat}Gain`] = finalGain;
            experienceGained += finalGain * 3;
        }

        // Apply duration multiplier
        const durationMultiplier = Math.min(2.0, session.duration / 60);
        Object.keys(statsGained).forEach(key => {
            statsGained[key] = Math.floor(statsGained[key] * durationMultiplier);
        });
        experienceGained = Math.floor(experienceGained * durationMultiplier);

        // Update character
        const updateData: Prisma.CharacterUpdateInput = {
            energy: Math.max(0, character.energy - costs.energy),
            motivation: Math.max(0, character.motivation - costs.motivation),
            experience: character.experience + experienceGained,
            // Apply stat gains
            power: character.power + (statsGained.powerGain || 0),
            speed: character.speed + (statsGained.speedGain || 0),
            technique: character.technique + (statsGained.techniqueGain || 0),
            jump: character.jump + (statsGained.jumpGain || 0),
            stamina: character.stamina + (statsGained.staminaGain || 0),
            mental: character.mental + (statsGained.mentalGain || 0),
            attack: character.attack + (statsGained.attackGain || 0),
            block: character.block + (statsGained.blockGain || 0),
            receive: character.receive + (statsGained.receiveGain || 0),
            serve: character.serve + (statsGained.serveGain || 0),
            set: character.set + (statsGained.setGain || 0),
        };

        // Check for level up
        const newLevel = await this.calculateLevel(character.experience + experienceGained);
        if (newLevel > character.level) {
            updateData.level = newLevel;
        }

        // Apply chemistry bonus for team practice
        let chemistryBonus = 0;
        if (session.trainingType === TrainingType.TEAM_PRACTICE && 'chemistryBonus' in trainingData) {
            chemistryBonus = trainingData.chemistryBonus as number;
        }

        await prisma.$transaction([
            // Update character
            prisma.character.update({
                where: { id: session.characterId },
                data: updateData
            }),

            // Create training record
            prisma.trainingRecord.create({
                data: {
                    characterId: session.characterId,
                    trainingType: session.trainingType,
                    duration: session.duration,
                    intensity: session.intensity,
                    energyCost: costs.energy,
                    motivationCost: costs.motivation,
                    ...statsGained
                }
            }),

            // Update team chemistry if applicable
            ...(chemistryBonus > 0 ? [
                prisma.teamMember.updateMany({
                    where: {
                        characterId: session.characterId,
                        team: { isActive: true }
                    },
                    data: {
                        chemistry: {
                            increment: chemistryBonus
                        }
                    }
                })
            ] : [])
        ]);

        return {
            success: true,
            message: `Training completed successfully! ${newLevel > character.level ? `Level up! Now level ${newLevel}` : ''}`,
            statsGained,
            experienceGained,
            energyUsed: costs.energy,
            motivationUsed: costs.motivation
        };
    }

    /**
     * Recover energy and motivation over time
     */
    static async recoverCharacter(characterId: string): Promise<void> {
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: {
                id: true,
                energy: true,
                motivation: true,
                updatedAt: true
            }
        });

        if (!character) return;

        const now = new Date();
        const hoursPassed = Math.floor((now.getTime() - character.updatedAt.getTime()) / (1000 * 60 * 60));

        if (hoursPassed > 0) {
            const energyRecovered = Math.min(GAME_CONSTANTS.MAX_ENERGY,
                character.energy + (hoursPassed * GAME_CONSTANTS.ENERGY_RECOVERY_RATE));
            const motivationRecovered = Math.min(GAME_CONSTANTS.MAX_MOTIVATION,
                character.motivation + (hoursPassed * GAME_CONSTANTS.MOTIVATION_RECOVERY_RATE));

            await prisma.character.update({
                where: { id: characterId },
                data: {
                    energy: energyRecovered,
                    motivation: motivationRecovered
                }
            });
        }
    }

    /**
     * Calculate level from experience
     */
    static async calculateLevel(experience: number): Promise<number> {
        let level = 1;
        let totalExp = 0;

        while (level < GAME_CONSTANTS.MAX_LEVEL) {
            const expForNextLevel = calculateExpRequired(level + 1);
            if (totalExp + expForNextLevel > experience) {
                break;
            }
            totalExp += expForNextLevel;
            level++;
        }

        return level;
    }

    /**
     * Get character's training recommendations
     */
    static getTrainingRecommendations(character: Character): TrainingType[] {
        const recommendations: TrainingType[] = [];

        // Low energy/motivation = recovery
        if (character.energy < 30 || character.motivation < 30) {
            recommendations.push(TrainingType.RECOVERY);
            return recommendations;
        }

        // Get lowest stats and recommend training
        const stats = [
            { name: 'power', value: character.power, training: TrainingType.POWER_TRAINING },
            { name: 'speed', value: character.speed, training: TrainingType.SPEED_TRAINING },
            { name: 'technique', value: character.technique, training: TrainingType.TECHNIQUE_TRAINING },
            { name: 'jump', value: character.jump, training: TrainingType.JUMP_TRAINING },
            { name: 'stamina', value: character.stamina, training: TrainingType.STAMINA_TRAINING },
            { name: 'mental', value: character.mental, training: TrainingType.MENTAL_TRAINING }
        ];

        // Sort by lowest stats
        stats.sort((a, b) => a.value - b.value);

        // Recommend training for 3 lowest stats
        recommendations.push(...stats.slice(0, 3).map(stat => stat.training));

        // Always recommend team practice
        recommendations.push(TrainingType.TEAM_PRACTICE);

        return recommendations;
    }

    /**
     * Get character's eligible techniques
     */
    static async getEligibleTechniques(characterId: string) {
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            include: {
                learnedTechniques: {
                    select: { techniqueId: true }
                }
            }
        });

        if (!character) return [];

        const learnedTechniqueIds = character.learnedTechniques.map(ct => ct.techniqueId);

        return await prisma.technique.findMany({
            where: {
                id: {
                    notIn: learnedTechniqueIds
                },
                allowedPositions: {
                    has: character.primaryPosition
                },
                requiredLevel: {
                    lte: character.level
                },
                requiredPower: {
                    lte: character.power
                },
                requiredSpeed: {
                    lte: character.speed
                },
                requiredTechnique: {
                    lte: character.technique
                },
                requiredJump: {
                    lte: character.jump
                },
                requiredMental: {
                    lte: character.mental
                }
            },
            orderBy: [
                { difficulty: 'asc' },
                { requiredLevel: 'asc' }
            ]
        });
    }

    /**
     * Learn a technique
     */
    static async learnTechnique(characterId: string, techniqueId: string): Promise<{ success: boolean; message: string }> {
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });

        if (!character) {
            return { success: false, message: "Character not found" };
        }

        const technique = await prisma.technique.findUnique({
            where: { id: techniqueId }
        });

        if (!technique) {
            return { success: false, message: "Technique not found" };
        }

        // Check if already learned
        const existing = await prisma.characterTechnique.findUnique({
            where: {
                characterId_techniqueId: {
                    characterId,
                    techniqueId
                }
            }
        });

        if (existing) {
            return { success: false, message: "Technique already learned" };
        }

        // Check requirements
        const allowedPositions = technique.allowedPositions as Position[];
        if (!allowedPositions.includes(character.primaryPosition) &&
            (!character.secondaryPosition || !allowedPositions.includes(character.secondaryPosition))) {
            return { success: false, message: "Position not allowed for this technique" };
        }

        if (character.level < technique.requiredLevel ||
            character.power < technique.requiredPower ||
            character.speed < technique.requiredSpeed ||
            character.technique < technique.requiredTechnique ||
            character.jump < technique.requiredJump ||
            character.mental < technique.requiredMental) {
            return { success: false, message: "Requirements not met" };
        }

        // Learn the technique
        await prisma.characterTechnique.create({
            data: {
                characterId,
                techniqueId,
                proficiency: 1,
                experience: 0
            }
        });

        return { success: true, message: `Successfully learned ${technique.name}!` };
    }
}