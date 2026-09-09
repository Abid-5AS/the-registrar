import { describe, expect, it } from "vitest";
import { RunnerSystem, tuning } from "./RunnerSystem";
import { parseSave } from "./SaveManager";
function advance(r: RunnerSystem, seconds: number) {
  for (let i = 0; i < seconds * 100; i++) r.update(0.01);
}
describe("responsive, forgiving runner", () => {
  it("smoothly changes lanes, clamps bounds, jumps and lands, and slides temporarily", () => {
    const r = new RunnerSystem("normal");
    r.input("left");
    r.input("left");
    advance(r, 0.3);
    expect(r.lane).toBe(0);
    expect(r.x).toBeCloseTo(-3.3, 1);
    r.input("jump");
    advance(r, 0.35);
    expect(r.jump).toBeGreaterThan(1.5);
    advance(r, 0.8);
    expect(r.jump).toBe(0);
    r.input("slide");
    expect(r.slide).toBe(true);
    advance(r, 1.1);
    expect(r.slide).toBe(false);
  });
  it("requires three spaced collisions and consumes a shield first", () => {
    const r = new RunnerSystem("normal");
    r.shield = true;
    r.hit("paper");
    expect(r.hearts).toBe(3);
    expect(r.shield).toBe(false);
    r.elapsed += 3;
    r.hit("paper");
    r.hit("paper");
    expect(r.hearts).toBe(2);
    r.elapsed += 3;
    r.hit("paper");
    expect(r.ended).toBe(false);
    r.elapsed += 3;
    r.hit("paper");
    expect(r.ended).toBe(true);
  });
  it.each(["relaxed", "normal", "unhinged"] as const)(
    "gives ample revision reaction time in %s",
    (level) => {
      const r = new RunnerSystem(level);
      r.speed = tuning[level].max;
      r.elapsed = 120;
      r.items = [
        { kind: "cabinet", lane: 1, z: 3, active: true },
        { kind: "bar", lane: 0, z: -30, active: true },
      ];
      r.revision();
      expect(r.items).toHaveLength(0);
      expect(-r.gateZ / r.speed).toBeGreaterThanOrEqual(tuning[level].reaction);
      expect(r.slowUntil).toBeGreaterThan(r.elapsed);
      expect(r.roomLane).toBe(1);
      r.input("right");
      r.input("left");
      advance(r, 16);
      expect(r.survivedRevisions).toBe(1);
      expect(r.hearts).toBe(3);
    },
  );
  it("mistaking a destination costs only one card", () => {
    const r = new RunnerSystem("normal");
    r.speed = 10;
    r.revision();
    r.input("left");
    advance(r, 13);
    expect(r.hearts).toBe(2);
    expect(r.ended).toBe(false);
    expect(
      r.drainEvents().some((e) => e.type === "gate" && e.value === "wrong"),
    ).toBe(true);
  });
  it("does not revise a locked schedule", () => {
    const r = new RunnerSystem("normal");
    r.lockUntil = 100;
    r.revision();
    expect(r.revisions).toBe(0);
  });
  it("never spawns more than two blocked lanes at one depth", () => {
    const r = new RunnerSystem("unhinged", () => 0.8);
    r.elapsed = 150;
    r.nextRevision = 9999;
    r.nextSpawn = 150;
    r.update(0.01);
    const hazards = r.items.filter(
      (i) =>
        i.kind === "stack" ||
        i.kind === "desk" ||
        i.kind === "bar" ||
        i.kind === "cabinet",
    );
    expect(hazards.length).toBeLessThanOrEqual(2);
  });
  it("jump clears low stacks, slide clears boards, tall cabinets remain solid", () => {
    const r = new RunnerSystem("normal");
    r.jump = 2;
    r.velocityY = 0;
    r.items = [{ kind: "stack", lane: 1, z: 4, active: true }];
    r.update(0.01);
    expect(r.hearts).toBe(3);
    r.jump = 0;
    r.slideRemaining = 1;
    r.items = [{ kind: "bar", lane: 1, z: 4, active: true }];
    r.update(0.01);
    expect(r.hearts).toBe(3);
    r.jump = 2;
    r.items = [{ kind: "cabinet", lane: 1, z: 4, active: true }];
    r.update(0.01);
    expect(r.hearts).toBe(2);
  });
  it("clearly telegraphs boss stamps and ends the inspection after 30 seconds", () => {
    const r = new RunnerSystem("normal", () => 0);
    r.elapsed = 300;
    r.nextRevision = 9999;
    r.nextSpawn = 9999;
    r.nextPickup = 9999;
    r.update(0.01);
    expect(r.boss).toBe(true);
    advance(r, 5.1);
    expect(r.warningLane).toBe(0);
    expect(r.warningUntil - r.elapsed).toBeGreaterThan(3);
    advance(r, 25);
    expect(r.boss).toBe(false);
    expect(r.drainEvents().some((e) => e.type === "boss-end")).toBe(true);
    expect(r.hearts).toBe(3);
  });
  it("does not continue scoring after a run ends", () => {
    const r = new RunnerSystem("normal");
    r.ended = true;
    advance(r, 2);
    expect(r.score).toBe(0);
    expect(r.elapsed).toBe(0);
  });
});
describe("safe local saves", () => {
  it("recovers absent and corrupt saves", () => {
    expect(parseSave(null).highScore).toBe(0);
    expect(parseSave("broken").settings.chaosLevel).toBe("normal");
  });
  it("rejects invalid nested values and clamps volumes", () => {
    const s = parseSave(
      JSON.stringify({
        version: 1,
        highScore: -1,
        settings: {
          masterVolume: 500,
          musicVolume: "loud",
          largeText: "yes",
          chaosLevel: "evil",
        },
        stats: { runs: "infinity" },
        achievements: ["legend", "legend", 8],
      }),
    );
    expect(s.highScore).toBe(0);
    expect(s.settings.masterVolume).toBe(1);
    expect(s.settings.musicVolume).toBe(0.18);
    expect(s.settings.largeText).toBe(false);
    expect(s.settings.chaosLevel).toBe("normal");
    expect(s.achievements).toEqual(["legend"]);
    expect(s.stats.runs).toBe(0);
  });
});

describe("office session recovery", () => {
  it("restores a resolved decision without replaying it", () => {
    const saved = parseSave(
      JSON.stringify({
        version: 1,
        office: {
          day: 2,
          revision: 7,
          stamps: ["REVISED"],
          session: {
            step: 3,
            choice: 1,
            meters: {
              authority: 70,
              clarity: 80,
              confusion: 10,
              threat: 5,
              attachments: 2,
              revision: 7,
            },
          },
        },
      }),
    );
    expect(saved.office.session?.step).toBe(3);
    expect(saved.office.session?.choice).toBe(1);
    expect(saved.office.session?.meters.clarity).toBe(80);
  });
  it("rejects impossible steps or choices from damaged saves", () => {
    for (const session of [
      { step: 8, choice: 0, meters: {} },
      { step: 1, choice: 99, meters: {} },
      { step: 1.5, choice: 0, meters: {} },
    ])
      expect(
        parseSave(JSON.stringify({ version: 1, office: { session } })).office
          .session,
      ).toBeNull();
  });
});
