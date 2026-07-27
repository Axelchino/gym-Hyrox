export type HyroxDayType = 'run' | 'strength' | 'gym' | 'rest' | 'sim' | 'race';

export interface HyroxDay {
  date: string; // YYYY-MM-DD
  week: number; // 0 = prep week
  dow: string;
  type: HyroxDayType;
  title: string;
  detail: string;
}

export interface HyroxPhase {
  name: string;
  weeks: number[];
  color: string;
}

export type PillarRole = 'lift' | 'qualityRun' | 'gym' | 'longOrSim';
export type RecoveryOption = 'rest' | 'easyWalk' | 'easyRun' | 'easyLift';
export type HyroxTier = 'top5' | 'top10' | 'top20';

export type DaySlot = [HyroxDayType, string, string];

export interface HyroxWeek {
  km: number;
  deload?: boolean;
  race?: boolean;
  bench?: string;
  pillars: Record<PillarRole, DaySlot>;
}

// Which real weekday each pillar role falls on. Always exactly one weekday
// per role — editing this is a swap (see hyroxPlan.ts), never a free
// assignment, so it can't end up with a missing or duplicated day.
export type PillarDayMap = Record<PillarRole, string>;

// Which RecoveryOption each of the remaining (non-pillar) weekdays uses.
// Only ever has entries for the 3 weekdays not claimed by PillarDayMap.
export type RecoveryChoices = Record<string, RecoveryOption>;

export interface HyroxBenchmark {
  event: string;
  time: string;
  date: string;
}

export interface HyroxGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HyroxGroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  name?: string;
  email?: string;
}

export interface HyroxProgress {
  userId: string;
  done: Record<string, boolean>;
  times: Record<string, string>;
  benchmarks: HyroxBenchmark[];
  stations: Record<string, string>;
  pillarDayMap: PillarDayMap;
  recoveryChoices: RecoveryChoices;
  tier: HyroxTier;
  updatedAt: string;
}

// Matches the plan's original Mon/Tue/Thu/Sat layout exactly, so anyone
// who never touches the Setup screen sees the plan behave exactly as
// before this feature existed.
export const DEFAULT_PILLAR_DAY_MAP: PillarDayMap = {
  lift: 'Mon',
  qualityRun: 'Tue',
  gym: 'Thu',
  longOrSim: 'Sat',
};
export const DEFAULT_RECOVERY_CHOICES: RecoveryChoices = {
  Wed: 'easyWalk',
  Fri: 'easyRun',
  Sun: 'rest',
};

export const HYROX_PROGRESS_EMPTY: Omit<HyroxProgress, 'userId' | 'updatedAt'> = {
  done: {},
  times: { Mon: '17:30', Tue: '17:30', Wed: '17:30', Thu: '17:30', Fri: '17:30', Sat: '08:00', Sun: '08:00' },
  benchmarks: [],
  stations: {},
  pillarDayMap: DEFAULT_PILLAR_DAY_MAP,
  recoveryChoices: DEFAULT_RECOVERY_CHOICES,
  tier: 'top5',
};

export interface HyroxAdminGroupSummary {
  groupId: string;
  groupName: string;
  members: { name: string; currentWeek: number; percentDone: number }[];
}
