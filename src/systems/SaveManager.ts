import type { SaveData, Settings, OfficeMeters } from "../types";
export const SAVE_KEY = "registrar.academic-chaos.v1";
export const defaultSettings: Settings = {
  chaosLevel: "normal",
  reducedShake: false,
  reducedFlashing: true,
  largeText: false,
  highContrast: false,
  masterVolume: 0.5,
  musicVolume: 0.18,
  notificationVolume: 0.55,
};
export const freshSave = (): SaveData => ({
  version: 1,
  highScore: 0,
  longestRun: 0,
  achievements: [],
  settings: { ...defaultSettings },
  stats: {
    runs: 0,
    attachments: 0,
    obsolete: 0,
    groupChats: 0,
    officeDays: 0,
    bestClarity: 0,
    rouletteCorrect: 0,
    inboxBest: 0,
  },
  office: { day: 1, revision: 0, stamps: [], session: null },
});
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const number = (v: unknown, fallback = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0
    ? Math.min(v, max)
    : fallback;
export function parseSave(raw: string | null): SaveData {
  const clean = freshSave();
  try {
    const v: unknown = JSON.parse(raw ?? "null");
    if (!record(v) || v.version !== 1) return clean;
    clean.highScore = number(v.highScore);
    clean.longestRun = number(v.longestRun);
    if (Array.isArray(v.achievements))
      clean.achievements = [
        ...new Set(
          v.achievements.filter((x): x is string => typeof x === "string"),
        ),
      ];
    if (record(v.settings)) {
      const s = v.settings;
      for (const key of [
        "reducedShake",
        "reducedFlashing",
        "largeText",
        "highContrast",
      ] as const)
        if (typeof s[key] === "boolean") clean.settings[key] = s[key];
      for (const key of [
        "masterVolume",
        "notificationVolume",
        "musicVolume",
      ] as const)
        clean.settings[key] = number(s[key], clean.settings[key], 1);
      if (
        s.chaosLevel === "relaxed" ||
        s.chaosLevel === "normal" ||
        s.chaosLevel === "unhinged"
      )
        clean.settings.chaosLevel = s.chaosLevel;
    }
    if (record(v.stats))
      for (const key of Object.keys(clean.stats) as (keyof SaveData["stats"])[])
        clean.stats[key] = number(v.stats[key]);
    if (record(v.office))
      clean.office = {
        day: Math.max(1, number(v.office.day, 1)),
        revision: number(v.office.revision, 0, 50),
        stamps: Array.isArray(v.office.stamps)
          ? v.office.stamps
              .filter(
                (x): x is string =>
                  typeof x === "string" &&
                  [
                    "REVISED",
                    "FINAL",
                    "UPDATED",
                    "CORRECTED",
                    "FURTHER REVISED",
                  ].includes(x),
              )
              .slice(-50)
          : [],
        session: null,
      };
    if (record(v.office) && record(v.office.session)) {
      const session = v.office.session;
      if (
        Number.isInteger(session.step) &&
        typeof session.step === "number" &&
        session.step >= 0 &&
        session.step < 8 &&
        record(session.meters) &&
        (session.choice === null ||
          (Number.isInteger(session.choice) &&
            typeof session.choice === "number" &&
            session.choice >= 0 &&
            session.choice < 3))
      ) {
        const meters: OfficeMeters = {
          authority: 50,
          clarity: 40,
          confusion: 25,
          threat: 10,
          attachments: 0,
          revision: clean.office.revision,
        };
        for (const key of Object.keys(meters) as (keyof OfficeMeters)[])
          meters[key] = number(
            session.meters[key],
            meters[key],
            key === "revision" ? 50 : 100,
          );
        clean.office.session = {
          step: session.step,
          choice: session.choice,
          meters,
        };
      }
    }
  } catch {
    /* A broken save is just a fresh semester. */
  }
  return clean;
}
export class SaveManager {
  data: SaveData;
  available = true;
  constructor() {
    try {
      this.data = parseSave(localStorage.getItem(SAVE_KEY));
    } catch {
      this.data = freshSave();
      this.available = false;
    }
  }
  write() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      this.available = false;
    }
  }
  unlock(id: string): boolean {
    if (this.data.achievements.includes(id)) return false;
    this.data.achievements.push(id);
    this.write();
    return true;
  }
}
