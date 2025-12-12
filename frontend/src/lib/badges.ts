export interface BadgeLevelConfig {
  level: number;
  minPoints: number;
  title: string;
  description: string;
  mantra: string;
}

export const BADGE_LEVELS: BadgeLevelConfig[] = [
  {
    level: 0,
    minPoints: 0,
    title: "New Member",
    description: "Getting oriented and preparing identity artifacts.",
    mantra: "Complete onboarding to unlock trust signals.",
  },
  {
    level: 1,
    minPoints: 120,
    title: "Trusted Member",
    description: "Verified identity and ready to support neighbors.",
    mantra: "Share proof, start lending your voice.",
  },
  {
    level: 2,
    minPoints: 300,
    title: "Verified Contributor",
    description: "Actively reviewing dossiers and giving trusted feedback.",
    mantra: "Consistency builds a resilient community.",
  },
  {
    level: 3,
    minPoints: 600,
    title: "Community Pillar",
    description: "Leading reviews and rallying others to participate.",
    mantra: "Model the network you want to live in.",
  },
  {
    level: 4,
    minPoints: 900,
    title: "Elder / Leader Verified",
    description: "Long-term steward keeping the registry healthy.",
    mantra: "Mentor validators and guard the trust graph.",
  },
];

export function resolveBadge(points: number) {
  const ordered = [...BADGE_LEVELS].sort((a, b) => a.minPoints - b.minPoints);
  let current = ordered[0];
  let next: BadgeLevelConfig | null = null;

  for (let i = 0; i < ordered.length; i += 1) {
    if (points >= ordered[i].minPoints) {
      current = ordered[i];
      next = ordered[i + 1] ?? null;
    } else {
      next = ordered[i];
      break;
    }
  }

  const progressToNext = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((points - current.minPoints) /
              (next.minPoints - current.minPoints)) *
              100
          )
        )
      )
    : 100;

  return {
    current,
    next,
    progressToNext,
  };
}
