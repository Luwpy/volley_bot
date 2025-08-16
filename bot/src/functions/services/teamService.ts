// src/functions/services/teamService.ts
import { prisma } from "#database";
import { Character, Position, Team, TeamMember } from "@prisma/client";
import { calculateTeamPower, GAME_CONSTANTS } from "../utils/gameUtils.js";

export interface TeamCreateData {
    name: string;
    tag?: string;
    ownerId: string;
    guildId: string;
}

export interface TeamMemberData {
    teamId: string;
    characterId: string;
    position: Position;
    isStarter?: boolean;
}

export interface TeamWithDetails extends Team {
    members: (TeamMember & {
        character: Character;
    })[];
    captain?: Character | null;
    owner: {
        id: string;
    };
}

export class TeamService {

    /**
     * Create a new team
     */
    static async createTeam(data: TeamCreateData): Promise<Team> {
        // Verify the owner exists
        const owner = await prisma.member.findUnique({
            where: {
                id_guildId: {
                    id: data.ownerId,
                    guildId: data.guildId
                }
            }
        });

        if (!owner) {
            throw new Error("Owner not found");
        }

        // Check if team name is already taken in guild
        const existingTeam = await prisma.team.findFirst({
            where: {
                guildId: data.guildId,
                name: data.name
            }
        });

        if (existingTeam) {
            throw new Error("Team name already exists in this guild");
        }

        return await prisma.team.create({
            data: {
                name: data.name,
                tag: data.tag,
                ownerId: data.ownerId,
                guildId: data.guildId
            }
        });
    }

    /**
     * Get team with full details
     */
    static async getTeamDetails(teamId: string): Promise<TeamWithDetails | null> {
        return await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    include: {
                        character: true
                    },
                    orderBy: [
                        { isStarter: 'desc' },
                        { joinedAt: 'asc' }
                    ]
                },
                captain: true,
                owner: {
                    select: { id: true }
                },
                homeMatches: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                },
                awayMatches: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            }
        }) as TeamWithDetails | null;
    }

    /**
     * Add a character to a team
     */
    static async addMember(data: TeamMemberData): Promise<{ success: boolean; message: string }> {
        const team = await prisma.team.findUnique({
            where: { id: data.teamId },
            include: {
                members: true
            }
        });

        if (!team) {
            return { success: false, message: "Team not found" };
        }

        if (!team.isActive) {
            return { success: false, message: "Cannot add members to inactive team" };
        }

        if (team.members.length >= GAME_CONSTANTS.MAX_TEAM_MEMBERS) {
            return { success: false, message: `Team is full (max ${GAME_CONSTANTS.MAX_TEAM_MEMBERS} members)` };
        }

        const character = await prisma.character.findUnique({
            where: { id: data.characterId },
            include: {
                teamMemberships: {
                    where: {
                        team: { isActive: true }
                    }
                }
            }
        });

        if (!character) {
            return { success: false, message: "Character not found" };
        }

        // Check if character is already in an active team
        if (character.teamMemberships.length > 0) {
            return { success: false, message: "Character is already in an active team" };
        }

        // Check if position is already taken by a starter
        if (data.isStarter) {
            const existingStarter = team.members.find(
                member => member.position === data.position && member.isStarter
            );

            if (existingStarter) {
                return { success: false, message: `Position ${data.position} is already taken by a starter` };
            }

            // Check if we already have 6 starters
            const starterCount = team.members.filter(member => member.isStarter).length;
            if (starterCount >= GAME_CONSTANTS.STARTING_LINEUP) {
                return { success: false, message: `Team already has ${GAME_CONSTANTS.STARTING_LINEUP} starters` };
            }
        }

        await prisma.teamMember.create({
            data: {
                teamId: data.teamId,
                characterId: data.characterId,
                position: data.position,
                isStarter: data.isStarter || false
            }
        });

        // Update team stats
        await this.updateTeamStats(data.teamId);

        return { success: true, message: "Character added to team successfully" };
    }

    /**
     * Remove a character from a team
     */
    static async removeMember(teamId: string, characterId: string): Promise<{ success: boolean; message: string }> {
        const teamMember = await prisma.teamMember.findUnique({
            where: {
                teamId_characterId: {
                    teamId,
                    characterId
                }
            },
            include: {
                team: true,
                character: true
            }
        });

        if (!teamMember) {
            return { success: false, message: "Character is not a member of this team" };
        }

        // Check if character is team captain
        if (teamMember.team.captainId === characterId) {
            return { success: false, message: "Cannot remove team captain. Transfer captaincy first." };
        }

        await prisma.teamMember.delete({
            where: {
                teamId_characterId: {
                    teamId,
                    characterId
                }
            }
        });

        // Update team stats
        await this.updateTeamStats(teamId);

        return { success: true, message: "Character removed from team successfully" };
    }

    /**
     * Set team captain
     */
    static async setCaptain(teamId: string, characterId: string): Promise<{ success: boolean; message: string }> {
        const teamMember = await prisma.teamMember.findUnique({
            where: {
                teamId_characterId: {
                    teamId,
                    characterId
                }
            }
        });

        if (!teamMember) {
            return { success: false, message: "Character is not a member of this team" };
        }

        await prisma.team.update({
            where: { id: teamId },
            data: { captainId: characterId }
        });

        return { success: true, message: "Captain set successfully" };
    }

    /**
     * Update starting lineup
     */
    static async updateStartingLineup(teamId: string, starters: { characterId: string; position: Position }[]): Promise<{ success: boolean; message: string }> {
        if (starters.length !== GAME_CONSTANTS.STARTING_LINEUP) {
            return { success: false, message: `Starting lineup must have exactly ${GAME_CONSTANTS.STARTING_LINEUP} players` };
        }

        // Check for duplicate positions (except libero can have multiple)
        const positions = starters.map(s => s.position);
        const uniquePositions = new Set(positions);
        if (uniquePositions.size !== positions.length && positions.some(p => p !== Position.LB)) {
            return { success: false, message: "Cannot have duplicate positions (except Libero)" };
        }

        // Verify all characters are team members
        const teamMembers = await prisma.teamMember.findMany({
            where: {
                teamId,
                characterId: { in: starters.map(s => s.characterId) }
            }
        });

        if (teamMembers.length !== starters.length) {
            return { success: false, message: "Some characters are not team members" };
        }

        await prisma.$transaction([
            // Remove all current starters
            prisma.teamMember.updateMany({
                where: { teamId },
                data: { isStarter: false }
            }),

            // Set new starters
            ...starters.map(starter =>
                prisma.teamMember.update({
                    where: {
                        teamId_characterId: {
                            teamId,
                            characterId: starter.characterId
                        }
                    },
                    data: {
                        isStarter: true,
                        position: starter.position
                    }
                })
            )
        ]);

        // Update team stats
        await this.updateTeamStats(teamId);

        return { success: true, message: "Starting lineup updated successfully" };
    }

    /**
     * Update team statistics
     */
    static async updateTeamStats(teamId: string): Promise<void> {
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    include: {
                        character: true
                    }
                }
            }
        });

        if (!team || team.members.length === 0) return;

        // Calculate average level
        const totalLevel = team.members.reduce((sum, member) => sum + member.character.level, 0);
        const averageLevel = totalLevel / team.members.length;

        // Calculate total power
        const totalPower = calculateTeamPower(team.members);

        // Calculate team chemistry (average of all member chemistry)
        const totalChemistry = team.members.reduce((sum, member) => sum + member.chemistry, 0);
        const teamChemistry = team.members.length > 0 ? Math.floor(totalChemistry / team.members.length) : 50;

        await prisma.team.update({
            where: { id: teamId },
            data: {
                averageLevel,
                totalPower,
                teamChemistry
            }
        });
    }

    /**
     * Get guild teams with pagination
     */
    static async getGuildTeams(guildId: string, page: number = 1, limit: number = 10) {
        const offset = (page - 1) * limit;

        const [teams, total] = await Promise.all([
            prisma.team.findMany({
                where: { guildId, isActive: true },
                include: {
                    members: {
                        include: {
                            character: {
                                select: {
                                    id: true,
                                    name: true,
                                    level: true,
                                    primaryPosition: true
                                }
                            }
                        },
                        where: { isStarter: true }
                    },
                    captain: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: [
                    { totalPower: 'desc' },
                    { wins: 'desc' }
                ],
                skip: offset,
                take: limit
            }),
            prisma.team.count({
                where: { guildId, isActive: true }
            })
        ]);

        return {
            teams,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Search teams by name or tag
     */
    static async searchTeams(guildId: string, query: string, limit: number = 10) {
        return await prisma.team.findMany({
            where: {
                guildId,
                isActive: true,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { tag: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                members: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                                level: true,
                                primaryPosition: true
                            }
                        }
                    },
                    where: { isStarter: true }
                },
                captain: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            take: limit,
            orderBy: { totalPower: 'desc' }
        });
    }

    /**
     * Get team formation suggestions
     */
    static getFormationSuggestions(): { name: string; positions: Position[]; description: string }[] {
        return [
            {
                name: "5-1 Formation",
                positions: [Position.SE, Position.OH, Position.OH, Position.MB, Position.WS, Position.LB],
                description: "One setter, five attackers. Most common formation."
            },
            {
                name: "6-2 Formation",
                positions: [Position.SE, Position.SE, Position.OH, Position.MB, Position.WS, Position.LB],
                description: "Two setters who also attack from back row."
            },
            {
                name: "4-2 Formation",
                positions: [Position.SE, Position.SE, Position.OH, Position.OH, Position.MB, Position.LB],
                description: "Two setters, four attackers. Good for beginners."
            },
            {
                name: "Defensive Setup",
                positions: [Position.SE, Position.OH, Position.MB, Position.MB, Position.LB, Position.LB],
                description: "Extra defense with two middle blockers and liberos."
            }
        ];
    }

    /**
     * Validate team formation
     */
    static validateFormation(positions: Position[]): { valid: boolean; issues: string[] } {
        const issues: string[] = [];

        if (positions.length !== GAME_CONSTANTS.STARTING_LINEUP) {
            issues.push(`Formation must have exactly ${GAME_CONSTANTS.STARTING_LINEUP} players`);
        }

        const positionCounts = positions.reduce((counts, pos) => {
            counts[pos] = (counts[pos] || 0) + 1;
            return counts;
        }, {} as Record<Position, number>);

        // Must have at least 1 setter
        if (!positionCounts[Position.SE] || positionCounts[Position.SE] < 1) {
            issues.push("Formation must have at least 1 setter");
        }

        // Cannot have more than 2 liberos
        if (positionCounts[Position.LB] && positionCounts[Position.LB] > 2) {
            issues.push("Formation cannot have more than 2 liberos");
        }

        // Should have attackers
        const attackerPositions = [Position.OH, Position.WS, Position.MB];
        const attackerCount = attackerPositions.reduce((sum, pos) => sum + (positionCounts[pos] || 0), 0);
        if (attackerCount < 3) {
            issues.push("Formation should have at least 3 attackers");
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Get team match history
     */
    static async getTeamMatchHistory(teamId: string, limit: number = 20) {
        return await prisma.match.findMany({
            where: {
                OR: [
                    { homeTeamId: teamId },
                    { awayTeamId: teamId }
                ]
            },
            include: {
                homeTeam: {
                    select: { id: true, name: true, tag: true }
                },
                awayTeam: {
                    select: { id: true, name: true, tag: true }
                }
            },
            orderBy: { finishedAt: 'desc' },
            take: limit
        });
    }

    /**
     * Disband team
     */
    static async disbandTeam(teamId: string, ownerId: string): Promise<{ success: boolean; message: string }> {
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: true
            }
        });

        if (!team) {
            return { success: false, message: "Team not found" };
        }

        if (team.ownerId !== ownerId) {
            return { success: false, message: "Only team owner can disband the team" };
        }

        await prisma.team.update({
            where: { id: teamId },
            data: { isActive: false }
        });

        return { success: true, message: "Team disbanded successfully" };
    }
}