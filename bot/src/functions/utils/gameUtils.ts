// src/functions/utils/gameUtils.ts
import { Position, Rarity, TrainingType } from "@prisma/client";

// Game constants
export const GAME_CONSTANTS = {
    // Character stats
    MIN_STAT: 1,
    MAX_STAT: 100,
    DEFAULT_STAT: 50,

    // Level progression
    MIN_LEVEL: 1,
    MAX_LEVEL: 100,
    BASE_EXP_REQUIRED: 100,
    EXP_MULTIPLIER: 1.5,

    // Energy and motivation
    MAX_ENERGY: 100,
    MAX_MOTIVATION: 100,
    ENERGY_RECOVERY_RATE: 10, // per hour
    MOTIVATION_RECOVERY_RATE: 5, // per hour

    // Training
    TRAINING_COST_BASE: 20,
    TRAINING_STAT_GAIN_BASE: 2,
    MAX_TRAINING_INTENSITY: 5,

    // Match
    MATCH_EXP_BASE: 50,
    MATCH_EXP_MULTIPLIER: 1.2,

    // Team
    MAX_TEAM_MEMBERS: 12,
    MIN_TEAM_MEMBERS: 6,
    STARTING_LINEUP: 6,

    // Chemistry
    MIN_CHEMISTRY: 0,
    MAX_CHEMISTRY: 100,
    DEFAULT_CHEMISTRY: 50,
} as const;

// Stat names type
export type StatName =
    | "power" | "speed" | "technique" | "jump" | "stamina" | "mental"
    | "attack" | "block" | "receive" | "serve" | "set";

// Position information
export const POSITIONS = {
    [Position.WS]: {
        name: "Wing Spiker",
        description: "Versatile attacker who plays on the wings",
        icon: "⚡",
        primaryStats: ["power", "jump", "attack"] as StatName[],
        color: "#FF6B6B"
    },
    [Position.SE]: {
        name: "Setter",
        description: "Playmaker who sets up attacks",
        icon: "🎯",
        primaryStats: ["technique", "mental", "set"] as StatName[],
        color: "#4ECDC4"
    },
    [Position.MB]: {
        name: "Middle Blocker",
        description: "Central defender and quick attacker",
        icon: "🛡️",
        primaryStats: ["jump", "power", "block"] as StatName[],
        color: "#45B7D1"
    },
    [Position.LB]: {
        name: "Libero",
        description: "Defensive specialist",
        icon: "🔰",
        primaryStats: ["speed", "receive", "mental"] as StatName[],
        color: "#96CEB4"
    },
    [Position.OH]: {
        name: "Outside Hitter",
        description: "Primary attacker from the left side",
        icon: "💥",
        primaryStats: ["power", "attack", "jump"] as StatName[],
        color: "#FFEAA7"
    }
} as const;

// Training type information
export const TRAINING_TYPES = {
    [TrainingType.POWER_TRAINING]: {
        name: "Power Training",
        description: "Weight training and spike practice",
        icon: "💪",
        primaryStat: "power",
        secondaryStats: ["attack"],
        energyCost: 25,
        motivationCost: 15
    },
    [TrainingType.SPEED_TRAINING]: {
        name: "Speed Training",
        description: "Agility and footwork drills",
        icon: "💨",
        primaryStat: "speed",
        secondaryStats: ["receive"],
        energyCost: 20,
        motivationCost: 10
    },
    [TrainingType.TECHNIQUE_TRAINING]: {
        name: "Technique Training",
        description: "Ball handling and precision work",
        icon: "🎯",
        primaryStat: "technique",
        secondaryStats: ["set"],
        energyCost: 15,
        motivationCost: 20
    },
    [TrainingType.JUMP_TRAINING]: {
        name: "Jump Training",
        description: "Plyometrics and vertical training",
        icon: "🦘",
        primaryStat: "jump",
        secondaryStats: ["block"],
        energyCost: 30,
        motivationCost: 15
    },
    [TrainingType.STAMINA_TRAINING]: {
        name: "Stamina Training",
        description: "Endurance and cardio work",
        icon: "🏃",
        primaryStat: "stamina",
        secondaryStats: ["speed"],
        energyCost: 20,
        motivationCost: 10
    },
    [TrainingType.MENTAL_TRAINING]: {
        name: "Mental Training",
        description: "Strategy and focus exercises",
        icon: "🧠",
        primaryStat: "mental",
        secondaryStats: ["set"],
        energyCost: 10,
        motivationCost: 25
    },
    [TrainingType.TEAM_PRACTICE]: {
        name: "Team Practice",
        description: "Scrimmage and coordination",
        icon: "👥",
        primaryStat: null,
        secondaryStats: ["technique", "mental"],
        energyCost: 25,
        motivationCost: 20,
        chemistryBonus: 5
    },
    [TrainingType.RECOVERY]: {
        name: "Recovery",
        description: "Rest and recovery session",
        icon: "😴",
        primaryStat: null,
        secondaryStats: [],
        energyCost: -30,
        motivationCost: -20
    }
} as const;

// Item rarity information
export const ITEM_RARITIES = {
    [Rarity.COMMON]: {
        name: "Common",
        color: "#9E9E9E",
        icon: "⚪",
        dropRate: 60
    },
    [Rarity.UNCOMMON]: {
        name: "Uncommon",
        color: "#4CAF50",
        icon: "🟢",
        dropRate: 25
    },
    [Rarity.RARE]: {
        name: "Rare",
        color: "#2196F3",
        icon: "🔵",
        dropRate: 10
    },
    [Rarity.EPIC]: {
        name: "Epic",
        color: "#9C27B0",
        icon: "🟣",
        dropRate: 4
    },
    [Rarity.LEGENDARY]: {
        name: "Legendary",
        color: "#FF9800",
        icon: "🟠",
        dropRate: 1
    }
} as const;

// Utility functions
export function calculateExpRequired(level: number): number {
    return Math.floor(GAME_CONSTANTS.BASE_EXP_REQUIRED * Math.pow(GAME_CONSTANTS.EXP_MULTIPLIER, level - 1));
}

export function calculateStatGain(baseGain: number, intensity: number, characterLevel: number): number {
    const intensityMultiplier = 1 + (intensity - 1) * 0.3;
    const levelPenalty = Math.max(0.5, 1 - (characterLevel - 1) * 0.01);
    return Math.floor(baseGain * intensityMultiplier * levelPenalty);
}

export function calculateTrainingCost(trainingType: TrainingType, intensity: number): { energy: number; motivation: number } {
    const baseData = TRAINING_TYPES[trainingType];
    const intensityMultiplier = 1 + (intensity - 1) * 0.5;

    return {
        energy: Math.floor(baseData.energyCost * intensityMultiplier),
        motivation: Math.floor(baseData.motivationCost * intensityMultiplier)
    };
}

export function canTrainAt(energy: number, motivation: number, trainingType: TrainingType, intensity: number): boolean {
    const cost = calculateTrainingCost(trainingType, intensity);
    return energy >= cost.energy && motivation >= cost.motivation;
}

export function getPositionBonus(position: Position, statName: StatName): number {
    const positionData = POSITIONS[position];
    if (positionData.primaryStats.includes(statName)) {
        return 1.2; // 20% bonus for primary stats
    }
    return 1.0;
}

export function calculateTeamPower(members: Array<{ character: { power: number; speed: number; technique: number; jump: number; stamina: number; mental: number } }>): number {
    if (members.length === 0) return 0;

    const totalPower = members.reduce((sum, member) => {
        const char = member.character;
        return sum + (char.power + char.speed + char.technique + char.jump + char.stamina + char.mental);
    }, 0);

    return Math.floor(totalPower / members.length);
}

export function getRandomRarity(): Rarity {
    const random = Math.random() * 100;
    let accumulated = 0;

    for (const [rarity, data] of Object.entries(ITEM_RARITIES)) {
        accumulated += data.dropRate;
        if (random <= accumulated) {
            return rarity as Rarity;
        }
    }

    return Rarity.COMMON;
}

export function formatStatValue(value: number): string {
    if (value >= 90) return `${value} 🔥`;
    if (value >= 75) return `${value} ⭐`;
    if (value >= 60) return `${value} ✨`;
    return `${value}`;
}

export function getStatEmoji(statName: StatName): string {
    const statEmojis: Record<StatName, string> = {
        power: "💪",
        speed: "💨",
        technique: "🎯",
        jump: "🦘",
        stamina: "🏃",
        mental: "🧠",
        attack: "⚔️",
        block: "🛡️",
        receive: "🤲",
        serve: "🏐",
        set: "👐"
    };

    return statEmojis[statName];
}

export function calculateMatchResult(homeTeamPower: number, awayTeamPower: number, homeChemistry: number, awayChemistry: number): {
    homeScore: number;
    awayScore: number;
    winner: "home" | "away" | "draw";
} {
    // Adjust team power with chemistry
    const adjustedHomePower = homeTeamPower * (1 + (homeChemistry - 50) / 100);
    const adjustedAwayPower = awayTeamPower * (1 + (awayChemistry - 50) / 100);

    // Add some randomness
    const homeVariance = (Math.random() - 0.5) * 0.3;
    const awayVariance = (Math.random() - 0.5) * 0.3;

    const finalHomePower = adjustedHomePower * (1 + homeVariance);
    const finalAwayPower = adjustedAwayPower * (1 + awayVariance);

    // Calculate scores (0-3 for volleyball)
    const powerDiff = (finalHomePower - finalAwayPower) / Math.max(finalHomePower, finalAwayPower);

    let homeScore: number;
    let awayScore: number;

    if (Math.abs(powerDiff) < 0.1) {
        // Very close match
        homeScore = Math.random() < 0.5 ? 3 : 2;
        awayScore = homeScore === 3 ? 2 : 3;
    } else if (powerDiff > 0.3) {
        // Home team much stronger
        homeScore = 3;
        awayScore = Math.random() < 0.7 ? 0 : 1;
    } else if (powerDiff < -0.3) {
        // Away team much stronger
        homeScore = Math.random() < 0.7 ? 0 : 1;
        awayScore = 3;
    } else {
        // Moderate difference
        if (powerDiff > 0) {
            homeScore = 3;
            awayScore = Math.random() < 0.6 ? 1 : 2;
        } else {
            homeScore = Math.random() < 0.6 ? 1 : 2;
            awayScore = 3;
        }
    }

    const winner = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";

    return { homeScore, awayScore, winner };
}