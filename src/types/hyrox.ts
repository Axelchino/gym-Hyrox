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

export interface HyroxWeek {
  km: number;
  deload?: boolean;
  race?: boolean;
  bench?: string;
  days: Record<string, [HyroxDayType, string, string]>;
}

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
  updatedAt: string;
}

export const HYROX_PROGRESS_EMPTY: Omit<HyroxProgress, 'userId' | 'updatedAt'> = {
  done: {},
  times: { Mon: '17:30', Tue: '17:30', Wed: '17:30', Thu: '17:30', Fri: '17:30', Sat: '08:00', Sun: '08:00' },
  benchmarks: [],
  stations: {},
};

export interface HyroxAdminGroupSummary {
  groupId: string;
  groupName: string;
  members: { name: string; currentWeek: number; percentDone: number }[];
}
