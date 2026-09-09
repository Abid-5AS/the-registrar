import type { ChaosLevel, PickupKind, RunnerItem } from "../types";
export interface RunEvent {
  type:
    | "revision"
    | "hit"
    | "pickup"
    | "gate"
    | "boss"
    | "boss-end"
    | "end"
    | "tip"
    | "cameo";
  title: string;
  text: string;
  value?: string;
}
export const rooms = ["301", "402", "302"];
export const tuning = {
  relaxed: { speed: 8, max: 12, interval: 50, reaction: 9, spawn: 3.5 },
  normal: { speed: 10, max: 15, interval: 38, reaction: 7.5, spawn: 3 },
  unhinged: { speed: 12, max: 17, interval: 28, reaction: 6.5, spawn: 2.5 },
};
export class RunnerSystem {
  lane = 1;
  x = 0;
  jump = 0;
  velocityY = 0;
  slideRemaining = 0;
  elapsed = 0;
  distance = 0;
  score = 0;
  tokens = 0;
  hearts = 3;
  items: RunnerItem[] = [];
  roomLane = 0;
  previousRoom = "301";
  revisions = 0;
  survivedRevisions = 0;
  gateZ = -200;
  gateActive = false;
  shield = false;
  slowUntil = 0;
  coffeeUntil = 0;
  lockUntil = 0;
  graceUntil = 0;
  ended = false;
  speed = 0;
  boss = false;
  bossAt = 300;
  bossEnd = 0;
  bossPatternAt = 0;
  warningLane = -1;
  warningUntil = 0;
  nextRevision = 30;
  nextSpawn = 5;
  nextPickup = 17;
  cameoShown = false;
  events: RunEvent[] = [];
  private cfg;
  private pickupIndex = 0;
  constructor(
    level: ChaosLevel,
    private random: () => number = Math.random,
  ) {
    this.cfg = tuning[level];
  }
  get slide() {
    return this.slideRemaining > 0;
  }
  input(action: string) {
    if (this.ended) return;
    if (action === "left") this.lane = Math.max(0, this.lane - 1);
    if (action === "right") this.lane = Math.min(2, this.lane + 1);
    if (action === "jump" && this.jump <= 0.03 && !this.slide)
      this.velocityY = 10;
    if (action === "slide" && this.jump < 0.1) this.slideRemaining = 1;
  }
  emit(type: RunEvent["type"], title: string, text: string, value?: string) {
    this.events.push({ type, title, text, value });
  }
  revision() {
    if (this.gateActive || this.elapsed < this.lockUntil) return;
    this.previousRoom = rooms[this.roomLane];
    this.roomLane = (this.roomLane + 1) % 3;
    this.revisions++;
    this.gateActive = true;
    this.gateZ = -Math.max(76, this.speed * this.cfg.reaction);
    this.slowUntil = this.elapsed + 3;
    this.items = this.items.filter((i) =>
      [
        "token",
        "shield",
        "coffee",
        "screenshot",
        "groupchat",
        "compare",
        "read",
      ].includes(i.kind),
    );
    this.warningLane = -1;
    this.nextSpawn = this.elapsed + this.cfg.reaction + 5;
    this.emit(
      "revision",
      this.revisions === 1
        ? "REVISED SCHEDULE"
        : this.revisions === 2
          ? "RE-REVISED SCHEDULE"
          : "FINAL. REVISED. AGAIN.",
      `Room ${this.previousRoom} → Room ${rooms[this.roomLane]}`,
      `Final_Updated_v${this.revisions + 1}.pdf`,
    );
  }
  hit(reason: string) {
    if (this.elapsed < this.graceUntil || this.ended) return;
    this.graceUntil = this.elapsed + 2.5;
    if (this.shield) {
      this.shield = false;
      this.emit(
        "hit",
        "ADMIT CARD ACCEPTED",
        "Your shield handled the paperwork.",
      );
      return;
    }
    this.hearts--;
    this.emit("hit", "MINOR ADMINISTRATIVE SETBACK", reason);
    if (this.hearts <= 0) {
      this.ended = true;
      this.emit("end", "YOUR RUN HAS BEEN FILED.", reason);
    }
  }
  pickup(kind: PickupKind) {
    if (kind === "token") {
      this.tokens++;
      this.score += 25;
      return;
    }
    const descriptions: Record<
      Exclude<PickupKind, "token">,
      [string, string]
    > = {
      shield: [
        "ADMIT CARD SHIELD",
        "One collision covered. No signatures required.",
      ],
      coffee: ["COFFEE", "Focus +20%. Sleep under review."],
      screenshot: ["SCREENSHOT SAVED", "Schedule locked for 15 seconds."],
      groupchat: [
        "STUDENT GROUP CHAT",
        `“Bro, room ${rooms[this.roomLane]}.” Follow the gold arrow.`,
      ],
      compare: [
        "COMPARE VERSIONS",
        "Outdated paperwork cleared from the path.",
      ],
      read: [
        "READ CAREFULLY",
        "A little breathing room. Slow motion for 6 seconds.",
      ],
    };
    if (kind === "shield") this.shield = true;
    if (kind === "coffee") this.coffeeUntil = this.elapsed + 6;
    if (kind === "screenshot") this.lockUntil = this.elapsed + 15;
    if (kind === "read") this.slowUntil = this.elapsed + 6;
    if (kind === "groupchat") this.score += 50;
    if (kind === "compare")
      this.items = this.items.filter(
        (i) => i.kind !== "stack" && i.kind !== "desk",
      );
    this.emit("pickup", ...descriptions[kind], kind);
  }
  update(dt: number) {
    if (this.ended) return;
    this.elapsed += dt;
    this.slideRemaining = Math.max(0, this.slideRemaining - dt);
    this.x += ((this.lane - 1) * 3.3 - this.x) * (1 - Math.exp(-18 * dt));
    if (this.jump > 0 || this.velocityY > 0) {
      this.velocityY -= 20 * dt;
      this.jump = Math.max(0, this.jump + this.velocityY * dt);
      if (!this.jump) this.velocityY = 0;
    }
    this.speed =
      Math.min(this.cfg.max, this.cfg.speed + this.elapsed / 70) *
      (this.elapsed < this.slowUntil ? 0.72 : 1) *
      (this.elapsed < this.coffeeUntil ? 1.12 : 1);
    this.distance += this.speed * dt;
    this.score += this.speed * dt * 2;
    if (
      this.elapsed >= this.nextRevision &&
      !this.gateActive &&
      this.elapsed >= this.lockUntil &&
      this.warningLane < 0
    ) {
      this.revision();
      this.nextRevision = this.elapsed + this.cfg.interval;
    }
    if (this.gateActive) {
      this.gateZ += this.speed * dt;
      if (this.gateZ >= 5) {
        this.gateActive = false;
        this.gateZ = -200;
        if (Math.abs(this.x - (this.roomLane - 1) * 3.3) < 1.45) {
          this.score += 250;
          this.survivedRevisions++;
          this.emit(
            "gate",
            "RIGHT ROOM. THIS TIME.",
            "+250 · Your attendance has been acknowledged.",
            "correct",
          );
        } else {
          this.hit(`Room ${rooms[this.roomLane]} was the current destination.`);
          this.emit(
            "gate",
            "TECHNICALLY CORRECT. EARLIER.",
            "One admit card used. Keep going.",
            "wrong",
          );
        }
        this.nextSpawn = this.elapsed + 3;
      }
    }
    if (
      this.elapsed >= this.nextSpawn &&
      !this.gateActive &&
      this.warningLane < 0
    ) {
      const lane = Math.floor(this.random() * 3);
      const kinds =
        this.elapsed < 20
          ? (["stack"] as const)
          : this.elapsed < 55
            ? (["stack", "desk"] as const)
            : (["stack", "desk", "bar", "cabinet"] as const);
      this.items.push({
        kind: kinds[Math.floor(this.random() * kinds.length)],
        lane,
        z: -70,
        active: true,
      });
      if (this.elapsed > 100 && this.random() > 0.55)
        this.items.push({
          kind: "stack",
          lane: (lane + 1) % 3,
          z: -70,
          active: true,
        });
      for (let i = 0; i < 4; i++)
        this.items.push({
          kind: "token",
          lane: (lane + 1) % 3,
          z: -66 - i * 2.6,
          active: true,
        });
      this.nextSpawn =
        this.elapsed + Math.max(2.1, this.cfg.spawn - this.elapsed / 500);
    }
    if (this.elapsed >= this.nextPickup && !this.gateActive) {
      const kinds: PickupKind[] = [
        "shield",
        "groupchat",
        "coffee",
        "compare",
        "screenshot",
        "read",
      ];
      this.items.push({
        kind: kinds[this.pickupIndex++ % kinds.length],
        lane: Math.floor(this.random() * 3),
        z: -55,
        active: true,
      });
      this.nextPickup = this.elapsed + 23;
    }
    for (const item of this.items) {
      item.z += this.speed * dt;
      if (
        item.active &&
        Math.abs(item.z - 4) < 0.9 &&
        Math.abs(this.x - (item.lane - 1) * 3.3) < 1.12
      ) {
        if (
          [
            "token",
            "shield",
            "coffee",
            "screenshot",
            "groupchat",
            "compare",
            "read",
          ].includes(item.kind)
        ) {
          if (this.jump < 2.1) {
            item.active = false;
            this.pickup(item.kind as PickupKind);
          }
        } else {
          const avoided =
            item.kind === "bar"
              ? this.slide
              : item.kind !== "cabinet" && this.jump > 1.16;
          if (!avoided) {
            item.active = false;
            this.hit(
              item.kind === "bar"
                ? "Slide under the low notice boards."
                : item.kind === "cabinet"
                  ? "Filing cabinets prefer to be passed on either side."
                  : "Jump over short paperwork, or choose another lane.",
            );
          }
        }
      }
    }
    this.items = this.items.filter((i) => i.active && i.z < 10);
    if (this.elapsed > 150 && !this.cameoShown && !this.gateActive) {
      this.cameoShown = true;
      this.emit(
        "cameo",
        "CHECK YOUR EMAIL!",
        "The Registrar is making his rounds.",
      );
    }
    if (this.elapsed >= this.bossAt && !this.gateActive) {
      this.boss = true;
      this.bossEnd = this.elapsed + 30;
      this.bossAt = this.elapsed + 210;
      this.bossPatternAt = this.elapsed + 5;
      this.emit(
        "boss",
        "ATTENTION ALL STUDENTS",
        "The Registrar · 30-second office inspection",
      );
    }
    if (this.boss) {
      if (this.elapsed >= this.bossEnd) {
        this.boss = false;
        this.warningLane = -1;
        this.emit(
          "boss-end",
          "INSPECTION SURVIVED",
          "+500 · No further action. For now.",
        );
        this.score += 500;
      } else if (
        this.elapsed > this.bossPatternAt &&
        !this.gateActive &&
        this.warningLane < 0
      ) {
        this.warningLane = Math.floor(this.random() * 3);
        this.warningUntil = this.elapsed + 3.5;
        this.bossPatternAt = this.elapsed + 9;
        this.items = this.items.filter((i) =>
          ["token", "shield"].includes(i.kind),
        );
        this.emit(
          "tip",
          "FINAL WARNING",
          `Stamp incoming · ${["left", "middle", "right"][this.warningLane]} lane. Move aside.`,
        );
      }
    }
    if (this.warningLane >= 0 && this.elapsed >= this.warningUntil) {
      if (Math.abs(this.x - (this.warningLane - 1) * 3.3) < 1.2)
        this.hit("The giant stamp requires personal space.");
      this.items.push({
        kind: "stamp",
        lane: this.warningLane,
        z: 7,
        active: true,
      });
      this.warningLane = -1;
    }
  }
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
