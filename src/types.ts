export type Mode = "survival" | "simulator" | "inbox" | "roulette";
export type Screen = "menu" | Mode | "results";
export type ChaosLevel = "relaxed" | "normal" | "unhinged";
export interface Settings {
  chaosLevel: ChaosLevel;
  reducedShake: boolean;
  reducedFlashing: boolean;
  largeText: boolean;
  highContrast: boolean;
  masterVolume: number;
  musicVolume: number;
  notificationVolume: number;
}
export interface SaveData {
  version: 1;
  highScore: number;
  longestRun: number;
  achievements: string[];
  settings: Settings;
  stats: {
    runs: number;
    attachments: number;
    obsolete: number;
    groupChats: number;
    officeDays: number;
    bestClarity: number;
    rouletteCorrect: number;
    inboxBest: number;
  };
  office: {
    day: number;
    revision: number;
    stamps: string[];
    session: OfficeSession | null;
  };
}
export interface OfficeSession {
  step: number;
  choice: number | null;
  meters: OfficeMeters;
}
export type PickupKind =
  | "token"
  | "shield"
  | "coffee"
  | "screenshot"
  | "groupchat"
  | "compare"
  | "read";
export type ObstacleKind = "stack" | "desk" | "bar" | "cabinet" | "stamp";
export interface RunnerItem {
  kind: ObstacleKind | PickupKind;
  lane: number;
  z: number;
  active: boolean;
}
export interface OfficeChoice {
  label: string;
  outcome: string;
  effects: Partial<OfficeMeters>;
  professional?: boolean;
}
export interface OfficeMeters {
  authority: number;
  clarity: number;
  confusion: number;
  threat: number;
  attachments: number;
  revision: number;
}
export interface OfficeEvent {
  title: string;
  body: string;
  choices: OfficeChoice[];
}
