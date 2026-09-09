import { World } from "./world/World";
import { SaveManager } from "./systems/SaveManager";
import { AudioManager } from "./systems/AudioManager";
import { RunnerSystem, rooms } from "./systems/RunnerSystem";
import { achievements } from "./data/achievements";
import { officeEvents } from "./data/events";
import {
  attachmentCases,
  obsoleteJokes,
  inboxReceipts,
} from "./data/attachments";
import type {
  Mode,
  Screen,
  OfficeMeters,
  Settings,
  OfficeChoice,
} from "./types";

const icons = {
  arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>',
  stamp:
    '<svg viewBox="0 0 24 24"><path d="M5 17h14v4H5zM9 17v-5c-4-5-1-10 3-10s7 5 3 10v5M3 22h18"/></svg>',
  runner:
    '<svg viewBox="0 0 24 24"><circle cx="15" cy="4" r="2"/><path d="m10 9 4-2 3 5 4 1M3 11l5-3 3 6-3 7m3-7 5 2 1 5"/></svg>',
  inbox:
    '<svg viewBox="0 0 24 24"><path d="M3 5h18v15H3zM3 6l9 7 9-7M7 2h10"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2m-8 14 9-9"/></svg>',
  trophy:
    '<svg viewBox="0 0 24 24"><path d="M7 3h10v8a5 5 0 0 1-10 0zM7 5H3v4a4 4 0 0 0 4 4m10-8h4v4a4 4 0 0 1-4 4M12 16v5M7 21h10"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg>',
  sound:
    '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>',
};
const modes: Record<
  Mode,
  {
    title: string;
    kicker: string;
    text: string;
    button: string;
    icon: keyof typeof icons;
    detail: string;
  }
> = {
  survival: {
    title: "Student Survival",
    kicker: "THE CAMPUS IS YOUR OBSTACLE COURSE",
    text: "Make it to your exam. Dodge the paperwork.\nTry to arrive in the room that still exists.",
    button: "Run to your exam",
    icon: "runner",
    detail: "3D endless runner",
  },
  simulator: {
    title: "Registrar Simulator",
    kicker: "WITH GREAT POWER COMES MORE PAPERWORK",
    text: "Take the big chair. Make the small decisions.\nGive “final” an entirely new meaning.",
    button: "Report for duty",
    icon: "stamp",
    detail: "Office management",
  },
  inbox: {
    title: "Inbox Panic",
    kicker: "TRUST THE TIMESTAMP. NOT THE CAPITAL LETTERS.",
    text: "Four emails. One latest schedule.\nYour inbox has become an archaeological site.",
    button: "Open your inbox",
    icon: "inbox",
    detail: "Calm filing or a sprint",
  },
  roulette: {
    title: "Attachment Roulette",
    kicker: "PLEASE FIND YOUR DESTINY ATTACHED",
    text: "A mysterious PDF. A few actual clues.\nRead between the bureaucratic lines.",
    button: "Open an attachment",
    icon: "clip",
    detail: "Attachment detective",
  },
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const format = (n: number) => Math.floor(n).toLocaleString("en-US");

export class Game {
  save = new SaveManager();
  audio = new AudioManager(() => this.save.data.settings);
  world: World;
  screen: Screen = "menu";
  selected: Mode = "survival";
  run?: RunnerSystem;
  paused = false;
  private lastFrame = 0;
  private time = 0;
  private uiTime = 0;
  private emailUntil = 0;
  private toastUntil = 0;
  private toastQueue: string[] = [];
  private dialog?: HTMLDialogElement;
  private wasPaused = false;
  private focusBefore?: HTMLElement;
  private cgpaClicks = 0;
  private cgpaAt = 0;
  private pointer?: { x: number; y: number };
  private officeStep = 0;
  private officeResolved = false;
  private officeChoiceIndex: number | null = null;
  private meters: OfficeMeters = {
    authority: 50,
    clarity: 40,
    confusion: 25,
    threat: 10,
    attachments: 0,
    revision: 0,
  };
  private inboxTimed = false;
  private inboxResolved = false;
  private inboxTime = 60;
  private inboxRound = 0;
  private inboxMistakes = 0;
  private inboxScore = 0;
  private inboxLatest = 0;
  private inboxOrder: number[] = [];
  private rouletteOrder: number[] = [];
  private rouletteAttempts = 0;
  private rouletteRound = 0;
  private rouletteAnswer = 0;
  private rouletteCorrect = 0;
  private rouletteRevealed = false;
  private tutorialAt = 0;
  private lastTokens = 0;
  constructor(
    private root: HTMLDivElement,
    canvas: HTMLCanvasElement,
  ) {
    this.world = new World(canvas, () => this.save.data.settings);
    this.applySettings();
    this.menu();
    document.addEventListener("click", (e) => this.click(e));
    document.addEventListener("change", (e) => this.setting(e));
    document.addEventListener("keydown", (e) => this.key(e));
    canvas.addEventListener("pointerdown", (e) => {
      if (this.screen === "survival") canvas.setPointerCapture(e.pointerId);
      this.pointer = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointerup", (e) => this.swipe(e));
    canvas.addEventListener("pointercancel", () => {
      this.pointer = undefined;
    });
    document.addEventListener("visibilitychange", () => {
      if (
        document.hidden &&
        this.screen !== "menu" &&
        this.screen !== "results" &&
        !this.dialog
      )
        this.pause();
    });
    window.addEventListener("blur", () => {
      if (
        (this.screen === "survival" || this.screen === "inbox") &&
        !this.dialog
      )
        this.pause();
    });
    document.addEventListener("dragstart", (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-stamp]");
      if (el) e.dataTransfer?.setData("text/plain", el.dataset.stamp!);
    });
    document.addEventListener("dragover", (e) => {
      if ((e.target as HTMLElement).closest("#craft-paper")) e.preventDefault();
    });
    document.addEventListener("drop", (e) => {
      if ((e.target as HTMLElement).closest("#craft-paper")) {
        e.preventDefault();
        const stamp = e.dataTransfer?.getData("text/plain");
        if (
          stamp &&
          [
            "REVISED",
            "FINAL",
            "UPDATED",
            "CORRECTED",
            "FURTHER REVISED",
          ].includes(stamp)
        )
          this.craft(stamp);
      }
    });
    requestAnimationFrame((t) => this.frame(t));
    if (!this.save.available)
      this.toast("Saving is unavailable in this browser. You can still play.");
  }
  private header(inGame = false) {
    return `<header class="topbar"><button class="brand" data-action="home" aria-label="Main menu"><span class="brand-mark">R<span>®</span></span><span>THE REGISTRAR<small>DEPARTMENT OF ACADEMIC CHAOS</small></span></button><nav>${inGame && document.fullscreenEnabled ? '<button class="icon-button fullscreen-button" data-action="fullscreen" aria-label="Toggle fullscreen">⛶</button>' : ""}${inGame ? '<button class="nav-button" data-action="pause">Ⅱ <span>Pause</span></button>' : `<button class="nav-button" data-action="achievements">${icons.trophy}<span>Achievements</span><small>${this.save.data.achievements.length}/${achievements.length}</small></button>`}<button class="nav-button" data-action="settings">${icons.settings}<span>Settings</span></button><button class="icon-button" data-action="mute" aria-label="${this.save.data.settings.masterVolume ? "Mute audio" : "Unmute audio"}">${icons.sound}<i class="${this.save.data.settings.masterVolume ? "sound-on" : ""}"></i></button></nav></header>`;
  }
  private menu() {
    window.scrollTo(0, 0);
    this.screen = "menu";
    this.paused = false;
    this.run = undefined;
    this.world.setMode("menu");
    this.world.resetItems();
    const mode = modes[this.selected];
    this.root.innerHTML = `${this.header()}<main class="menu-content"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> A VERY UNOFFICIAL CAMPUS ADVENTURE</p><h1><span>THE</span>REGISTRAR<span class="title-period">.</span></h1><div class="subtitle">ACADEMIC CHAOS <span class="edition">EST. EVERY SEMESTER</span></div><p class="legend-quote">“At UPR, <button data-action="cgpa" aria-label="CGPA">CGPA</button> matters.”</p><div class="mode-description"><p class="eyebrow">${mode.kicker}</p><p>${mode.text.replace("\n", "<br>")}</p><button class="play-button" data-action="play">${icons[mode.icon]}<span>${this.selected === "simulator" && this.save.data.office.session ? "Continue your office day" : mode.button}</span>${icons.arrow}</button><div class="play-caption"><span>NO DOWNLOADS. JUST DEADLINES.</span><span class="key-hint">↵ ENTER</span></div></div></div><div class="scene-label"><span class="live-dot"></span> RED HAVEN <span>09:57 AM</span></div><div class="best-score"><span>PERSONAL BEST</span><strong>${format(this.save.data.highScore)}</strong><small>POINTS · STUDENT SURVIVAL</small></div><div class="paper-note"><span>CAMPUS GUIDE</span><p>Red Haven in the brochure.<br>Red Hell in exam week.</p><i>Same bricks. Different semester.</i><b>REVISED</b></div></main><section class="mode-dock" aria-label="Choose game mode"><div class="dock-label">CHOOSE YOUR<br><strong>CHAOS.</strong><span>01 — 04</span></div>${(Object.keys(modes) as Mode[]).map((id, i) => `<button class="mode-tab ${this.selected === id ? "selected" : ""}" data-action="mode" data-mode="${id}" aria-pressed="${this.selected === id}"><span class="mode-number">0${i + 1}</span><span class="mode-icon">${icons[modes[id].icon]}</span><span class="mode-tab-copy"><strong>${modes[id].title}</strong><small>${modes[id].detail}</small></span><span class="mode-dot">↗</span></button>`).join("")}</section><footer class="menu-footer"><span>University of Perpetual Revision · An entirely fictional campus.</span><span>MADE FOR STUDENTS. APPROVED BY NO ONE. <b>v1.1</b></span></footer>`;
  }
  private click(event: MouseEvent) {
    const el = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-action]",
    );
    if (!el) return;
    const action = el.dataset.action;
    this.audio.start();
    if (action === "mode") {
      this.selected = el.dataset.mode as Mode;
      this.menu();
      this.audio.tone(420, 0.06, 0.08);
    }
    if (action === "play") this.start(this.selected);
    if (action === "home") {
      this.closeDialog();
      this.saveRun();
      this.menu();
    }
    if (action === "mute") {
      this.save.data.settings.masterVolume = this.save.data.settings
        .masterVolume
        ? 0
        : 0.5;
      this.save.write();
      el.setAttribute(
        "aria-label",
        this.save.data.settings.masterVolume ? "Mute audio" : "Unmute audio",
      );
      el.querySelector("i")?.classList.toggle(
        "sound-on",
        this.save.data.settings.masterVolume > 0,
      );
    }
    if (action === "settings") this.settings();
    if (action === "achievements") this.showAchievements();
    if (action === "close" || action === "resume") this.closeDialog();
    if (action === "fullscreen") {
      const result = document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen();
      void result.catch(() =>
        this.toast(
          "Fullscreen is unavailable in this browser. The game still works here.",
        ),
      );
    }
    if (action === "restart") {
      this.saveRun();
      if (this.selected === "simulator") {
        this.save.data.office.session = null;
        this.save.write();
      }
      this.start(this.selected, true);
    }
    if (action === "pause") this.pause();
    if (action === "start-run") {
      this.closeDialog();
      this.paused = false;
    }
    if (action === "retry") this.start(this.selected, true);
    if (action === "control" && !this.paused)
      this.run?.input(el.dataset.control!);
    if (action === "cgpa") this.legend();
    if (action === "office-choice") this.officeChoice(Number(el.dataset.index));
    if (action === "office-next") {
      if (!this.officeResolved) return;
      this.officeStep++;
      this.officeResolved = false;
      this.officeChoiceIndex = null;
      if (this.officeStep >= officeEvents.length) this.officeEnd();
      else {
        this.saveOfficeSession();
        this.renderOffice();
      }
    }
    if (action === "stamp") this.craft(el.dataset.stamp!);
    if (action === "inbox-sprint") {
      this.inboxTimed = true;
      this.closeDialog();
      this.paused = false;
      this.renderInbox();
      this.updateHUD();
    }
    if (action === "inbox-next" && this.inboxResolved) {
      this.inboxRound++;
      if (!this.inboxTimed && this.inboxRound >= 6) this.finishInbox();
      else this.renderInbox();
    }
    if (action === "context") this.attachmentHint();
    if (action === "inbox-choice")
      this.inboxChoice(Number(el.dataset.version), el as HTMLButtonElement);
    if (action === "roulette-choice")
      this.rouletteChoice(Number(el.dataset.index));
    if (action === "roulette-next") {
      if (!this.rouletteRevealed) return;
      this.rouletteRound++;
      if (this.rouletteRound >= 8)
        this.results(
          "ATTACHMENTS OPENED.",
          "Eight mysteries resolved. Context turned out to be useful.",
          [
            ["First-try deductions", `${this.rouletteCorrect} / 8`],
            ["Mysteries resolved", "8"],
          ],
          "The filenames have declined to comment.",
        );
      else this.renderRoulette();
    }
  }
  private start(mode: Mode, skipIntro = false) {
    this.closeDialog();
    window.scrollTo(0, 0);
    this.screen = mode;
    this.selected = mode;
    this.paused = false;
    this.emailUntil = 0;
    this.world.setMode(mode);
    if (mode === "survival") {
      this.run = new RunnerSystem(this.save.data.settings.chaosLevel);
      this.save.data.stats.runs++;
      this.save.write();
      this.world.resetItems();
      this.tutorialAt = 0;
      this.lastTokens = 0;
      this.root.innerHTML = `${this.header(true)}<div class="runner-hud"><div class="exam-info"><span class="eyebrow">TODAY’S EXAM</span><strong>CSE 404 <span>10:00 AM</span></strong><div class="room-value">ROOM <b id="room">301</b><span id="version">FINAL v1</span></div></div><div class="run-score"><span class="eyebrow">DISTANCE <b id="distance">0 m</b></span><strong id="score">0</strong><div><span class="dollar-counter" title="Campus dollars · fictional game currency">$<b id="tokens">0</b> <small>CAMPUS CASH</small></span><span id="hearts" aria-label="3 admit cards">▰ ▰ ▰</span></div></div></div><div id="email" class="email-popup" role="status" aria-live="polite"></div><div id="boss-warning" class="boss-warning"></div><div class="runner-bottom"><span id="zone" class="zone-label">01 / CAMPUS GATE</span><div id="route" class="route-guide">FOLLOW THE PATH. THE PAPERWORK CAN WAIT.</div><button class="pause-fab" data-action="pause" aria-label="Pause game">Ⅱ</button></div><div class="touch-controls" aria-label="Movement controls"><button data-action="control" data-control="left" aria-label="Move left">←</button><button data-action="control" data-control="slide" aria-label="Slide">↓</button><button data-action="control" data-control="jump" aria-label="Jump">↑</button><button data-action="control" data-control="right" aria-label="Move right">→</button></div><span class="rotate-hint">A wider campus awaits in landscape ↻</span>`;
      if (!skipIntro)
        this.openDialog(
          `<div class="dialog-icon">${icons.runner}</div><p class="eyebrow">BEFORE YOU RUN</p><h2>Your exam is this way.<br>For now.</h2><p>Collect $1 campus dollars (+25 points each). The tuition fund now has a cardio requirement. Jump over low paperwork, slide under notice boards, and change lanes around cabinets.</p><div class="control-lesson"><span><kbd>←</kbd><kbd>→</kbd><b>Change lanes</b><small>A / D</small></span><span><kbd>↑</kbd><b>Jump</b><small>W</small></span><span><kbd>↓</kbd><b>Slide</b><small>S</small></span></div><p class="quiet">On a phone, swipe or use the arrow buttons.<br>Three admit cards. Clear room changes. Plenty of time.</p><button class="play-button" data-action="start-run">Let’s run ${icons.arrow}</button>`,
          "tutorial",
        );
    } else if (mode === "simulator") {
      const session = this.save.data.office.session;
      this.officeStep = session?.step ?? 0;
      this.officeChoiceIndex = session?.choice ?? null;
      this.officeResolved = this.officeChoiceIndex !== null;
      this.meters = session
        ? { ...session.meters }
        : {
            authority: 50,
            clarity: 40,
            confusion: 25,
            threat: 10,
            attachments: 0,
            revision: this.save.data.office.revision,
          };
      this.saveOfficeSession();
      this.renderOffice();
    } else if (mode === "inbox") {
      this.inboxTimed = false;
      this.inboxResolved = false;
      this.inboxTime = 60;
      this.inboxRound = 0;
      this.inboxMistakes = 0;
      this.inboxScore = 0;
      this.renderInbox();
      this.openDialog(
        `<div class="dialog-icon">${icons.inbox}</div><p class="eyebrow">INBOX PANIC · PANIC OPTIONAL</p><h2>Trust the timestamp.</h2><p>Pick the newest email. The time and version number always agree. Opening an older copy simply archives it; you can try again.</p><p class="quiet">Quiet filing: six batches, no timer, no lives to lose.<br>For a little arcade pressure, the 60-second sprint is optional.</p><button class="play-button" data-action="start-run">Start quiet filing ${icons.arrow}</button><button class="text-button" data-action="inbox-sprint">Try the 60-second sprint →</button>`,
      );
    } else {
      this.rouletteRound = 0;
      this.rouletteCorrect = 0;
      this.rouletteOrder = attachmentCases
        .map((_, i) => i)
        .sort(() => Math.random() - 0.5);
      this.renderRoulette();
    }
  }
  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement).matches("input,select,textarea")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (this.dialog) {
        this.closeDialog();
      } else if (this.screen !== "menu" && this.screen !== "results")
        this.pause();
      return;
    }
    if (this.dialog) return;
    if (
      this.screen === "menu" &&
      e.key === "Enter" &&
      e.target === document.body
    ) {
      this.audio.start();
      this.start(this.selected);
      return;
    }
    if (this.screen === "survival") {
      const keys: Record<string, string> = {
        a: "left",
        ArrowLeft: "left",
        d: "right",
        ArrowRight: "right",
        w: "jump",
        ArrowUp: "jump",
        " ": "jump",
        s: "slide",
        ArrowDown: "slide",
      };
      if (keys[e.key]) {
        e.preventDefault();
        if (!this.paused && !e.repeat) this.run?.input(keys[e.key]);
      }
      if (e.key.toLowerCase() === "p") this.pause();
    }
  }
  private swipe(e: PointerEvent) {
    const pointer = this.pointer;
    this.pointer = undefined;
    if (!pointer || this.paused || this.screen !== "survival") return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    this.run?.input(
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "left"
          : "right"
        : dy < 0
          ? "jump"
          : "slide",
    );
  }
  private frame(ms: number) {
    const elapsed = (ms - (this.lastFrame || ms)) / 1000;
    const dt = Math.min(elapsed, 0.05);
    this.lastFrame = ms;
    if (!this.paused) this.time += dt;
    if (!this.paused && this.screen === "survival" && this.run) {
      this.run.update(dt);
      this.world.syncItems(this.run.items);
      for (const e of this.run.drainEvents()) {
        if (e.type === "revision") {
          this.audio.ping();
          this.email(e.title, e.text, e.value);
          if (this.run.revisions >= 2) this.unlock("temporary");
        }
        if (e.type === "pickup") {
          this.email(e.title, e.text);
          this.audio.collect();
          if (e.value === "groupchat") {
            this.save.data.stats.groupChats++;
            if (this.save.data.stats.groupChats >= 5) this.unlock("messenger");
            this.save.write();
          }
        }
        if (e.type === "hit") {
          this.world.screenShake = 0.16;
          this.world.burst(this.run.x);
          this.audio.stamp();
          this.email(e.title, e.text);
        }
        if (e.type === "gate") {
          if (e.value === "correct") this.world.burst(this.run.x);
          this.email(e.title, e.text);
          if (e.value === "wrong") this.unlock("wrong");
          if (this.run.survivedRevisions >= 3) this.unlock("revised");
        }
        if (e.type === "boss-end") {
          this.unlock("boss");
          this.email(e.title, e.text);
        }
        if (e.type === "boss" || e.type === "cameo" || e.type === "tip") {
          this.email(e.title, e.text);
          this.audio.stamp();
        }
        if (e.type === "end") {
          this.finishRun(e.text);
          break;
        }
      }
      if (this.run && this.screen === "survival") {
        if (this.run.tokens > this.lastTokens) {
          this.audio.collect();
          this.lastTokens = this.run.tokens;
        }
        if (this.run.elapsed > 5 && this.tutorialAt === 0) {
          this.email(
            "A LITTLE PAPERWORK AHEAD",
            "Jump over low stacks — or switch lanes.",
          );
          this.tutorialAt = 1;
        }
        if (
          this.run.elapsed > 55 &&
          this.tutorialAt === 1 &&
          !this.run.gateActive
        ) {
          this.email(
            "LOW NOTICE BOARDS",
            "Slide under coral boards. Dodge tall cabinets.",
          );
          this.tutorialAt = 2;
        }
      }
    }
    if (!this.paused && this.screen === "inbox" && this.inboxTimed) {
      this.inboxTime = Math.max(0, this.inboxTime - elapsed);
      if (this.inboxTime <= 0) this.finishInbox();
    }
    const run = this.run;
    this.world.update(
      this.paused ? 0 : dt,
      run
        ? {
            x: run.x,
            jump: run.jump,
            slide: run.slide,
            speed: this.paused || run.ended ? 0 : run.speed,
            boss: run.boss || (run.cameoShown && run.elapsed < 159),
            gateZ: run.gateZ,
            roomLane: run.roomLane,
            shield: run.shield,
            distance: run.distance,
            boost: run.elapsed < run.coffeeUntil,
          }
        : undefined,
    );
    this.audio.update(this.time, this.paused || document.hidden);
    if (this.time > this.uiTime) {
      this.uiTime = this.time + 0.09;
      this.updateHUD();
    }
    if (this.time > this.emailUntil)
      document.getElementById("email")?.classList.remove("visible");
    if (this.time > this.toastUntil) {
      document.getElementById("toast")?.classList.remove("visible");
      if (
        this.toastQueue.length &&
        this.time > this.emailUntil + 2 &&
        !this.dialog
      )
        this.toast(this.toastQueue.shift()!);
    }
    requestAnimationFrame((t) => this.frame(t));
  }
  private updateHUD() {
    const set = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== text) el.textContent = text;
    };
    if (this.screen === "survival" && this.run) {
      const r = this.run;
      document
        .querySelector("canvas")
        ?.setAttribute(
          "aria-label",
          `Student in ${["left", "middle", "right"][r.lane]} lane, ${r.jump > 0.1 ? "jumping" : r.slide ? "sliding" : "running"}. Destination: Room ${rooms[r.roomLane]}.`,
        );
      set("room", rooms[r.roomLane]);
      set(
        "version",
        r.elapsed < r.lockUntil
          ? "SCREENSHOT LOCKED"
          : `FINAL v${r.revisions + 1}`,
      );
      set("score", format(r.score));
      set("distance", `${format(r.distance)} m`);
      set("tokens", String(r.tokens));
      set("hearts", "▰ ".repeat(r.hearts).trim() + (r.shield ? " ◈" : ""));
      document
        .getElementById("hearts")
        ?.setAttribute(
          "aria-label",
          `${r.hearts} admit cards${r.shield ? " and a shield" : ""}`,
        );
      const zones = [
        "CAMPUS GATE",
        "ACADEMIC BLOCK",
        "LIBRARY WALK",
        "DORMITORY ROAD",
        "REGISTRAR OFFICE",
        "EXAM HALL CORRIDOR",
      ];
      const zone = Math.floor(r.distance / 500) % zones.length;
      set("zone", `0${zone + 1} / ${zones[zone]}`);
      set(
        "route",
        r.gateActive
          ? `${["← LEFT LANE", "↑ MIDDLE LANE", "RIGHT LANE →"][r.roomLane]} · ROOM ${rooms[r.roomLane]} · ${Math.max(1, Math.ceil((4 - r.gateZ) / r.speed))}s`
          : r.elapsed < 15
            ? "← → CHANGE LANES     ↑ JUMP     ↓ SLIDE"
            : r.shield
              ? "◈ ADMIT CARD SHIELD ACTIVE"
              : "COLLECT DOLLARS. OUTRUN THE FEES.",
      );
      document
        .getElementById("route")
        ?.classList.toggle("active", r.gateActive);
      const warning = document.getElementById("boss-warning");
      if (warning) {
        warning.classList.toggle("visible", r.warningLane >= 0);
        warning.style.left = `${15 + r.warningLane * 24}%`;
        warning.textContent =
          r.warningLane >= 0
            ? `STAMP IN ${Math.ceil(r.warningUntil - r.elapsed)} · MOVE ASIDE`
            : "";
      }
    }
    if (this.screen === "inbox")
      set(
        "inbox-clock",
        this.inboxTimed
          ? `${Math.ceil(this.inboxTime)}s`
          : `${this.inboxRound + 1} / 6`,
      );
  }
  private email(title: string, text: string, attachment?: string) {
    const el = document.getElementById("email");
    if (!el) return;
    el.innerHTML = `<span class="email-icon">${icons.inbox}</span><div><span class="eyebrow">${escape(title)}</span><strong>${escape(text)}</strong>${attachment ? `<small>↳ ${escape(attachment)}</small>` : ""}</div>`;
    el.classList.add("visible");
    this.emailUntil = this.time + 4.5;
  }
  private saveRun() {
    if (!this.run) return;
    this.save.data.highScore = Math.max(
      this.save.data.highScore,
      Math.floor(this.run.score),
    );
    this.save.data.longestRun = Math.max(
      this.save.data.longestRun,
      Math.floor(this.run.distance),
    );
    this.save.write();
  }
  private finishRun(reason: string) {
    if (!this.run) return;
    this.saveRun();
    const r = this.run;
    this.results(
      "YOUR RUN HAS\nBEEN FILED.",
      reason,
      [
        ["Score", format(r.score)],
        ["Distance", `${format(r.distance)} m`],
        ["Campus cash", `$${r.tokens}`],
        ["Revisions survived", String(r.survivedRevisions)],
      ],
      r.revisions > 0
        ? "Technically, you were correct at some point."
        : "The paperwork won this round. Your next attempt is pre-approved.",
    );
  }
  private results(
    title: string,
    text: string,
    stats: [string, string][],
    joke: string,
  ) {
    this.screen = "results";
    this.paused = false;
    this.root.innerHTML = `${this.header()}<main class="result-panel"><p class="eyebrow">OFFICIAL RECORD / SESSION COMPLETE</p><h2>${title.replace("\n", "<br>")}</h2><p>${escape(text)}</p><div class="result-stats">${stats.map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join("")}</div><p class="result-joke">${escape(joke)}</p><button class="play-button" data-action="retry">${this.selected === "simulator" ? "Another day at the office" : "Try again"} ${icons.arrow}</button><button class="text-button" data-action="home">← Back to campus</button></main>`;
    this.save.write();
  }
  private renderOffice() {
    const event = officeEvents[this.officeStep];
    this.world.setStack(this.meters.revision + this.meters.attachments);
    this.root.innerHTML = `${this.header(true)}<div class="office-heading"><p class="eyebrow">REGISTRAR SIMULATOR</p><h2>A good day<br>for paperwork.</h2><span class="office-day">DAY ${String(this.save.data.office.day).padStart(2, "0")} <b>● OFFICE OPEN</b></span></div><main class="office-panel"><div class="office-meters">${(["authority", "clarity", "confusion", "threat"] as const).map((key) => `<div><span>${key === "confusion" ? "Student confusion" : key === "threat" ? "Threat level" : key}<b>${this.meters[key]}</b></span><div class="meter"><i style="width:${this.meters[key]}%" class="${key}"></i></div></div>`).join("")}</div><div class="office-event"><p class="eyebrow">INCOMING / ${String(this.officeStep + 1).padStart(2, "0")} OF 08</p><h3>${event.title}</h3><p>${event.body}</p><div class="office-choices">${event.choices.map((choice, i) => `<button data-action="office-choice" data-index="${i}"><span>${String.fromCharCode(65 + i)}</span>${choice.label}${icons.arrow}</button>`).join("")}</div></div><section class="craft-section"><div class="craft-title"><span>REVISION DESK</span><span id="paper-count">STACK ${this.meters.revision} · ATTACHMENTS ${this.meters.attachments}</span></div><div id="craft-paper" class="craft-paper"><span>${icons.clip}</span><strong id="filename">${this.filename()}</strong><small>Drop a stamp here, or tap one below.</small></div><div class="stamps">${["REVISED", "FINAL", "UPDATED", "CORRECTED", "FURTHER REVISED"].map((s) => `<button draggable="true" data-action="stamp" data-stamp="${s}">${s}</button>`).join("")}</div></section></main><span class="office-caption">“Final” is a philosophical concept. · Your desk saves automatically.</span>`;
    if (this.officeChoiceIndex !== null)
      this.renderOfficeOutcome(event.choices[this.officeChoiceIndex]);
  }
  private saveOfficeSession() {
    this.save.data.office.stamps = this.save.data.office.stamps.slice(-50);
    this.save.data.office.session = {
      step: this.officeStep,
      choice: this.officeChoiceIndex,
      meters: { ...this.meters },
    };
    this.save.write();
  }
  private renderOfficeOutcome(c: OfficeChoice) {
    const choices = document.querySelector(".office-choices")!;
    choices.innerHTML = `<div class="decision-outcome"><span class="eyebrow">${c.professional ? "SUSPICIOUSLY REASONABLE" : "DECISION FILED"}</span><p>${c.outcome}</p><span class="effect-line">${Object.entries(
      c.effects,
    )
      .map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`)
      .join(
        " · ",
      )}</span></div><button class="next-choice" data-action="office-next">${this.officeStep === 7 ? "Close the office" : "Next item of business"} ${icons.arrow}</button>`;
  }
  private officeChoice(index: number) {
    if (this.screen !== "simulator" || this.officeResolved) return;
    const c = officeEvents[this.officeStep].choices[index];
    if (!c) return;
    this.officeResolved = true;
    this.officeChoiceIndex = index;
    for (const [key, value] of Object.entries(c.effects) as [
      keyof OfficeMeters,
      number,
    ][])
      this.meters[key] = Math.max(
        0,
        Math.min(key === "revision" ? 50 : 100, this.meters[key] + value),
      );
    if ((c.effects.revision ?? 0) > 0)
      for (let i = 0; i < c.effects.revision!; i++)
        this.save.data.office.stamps.push("REVISED");
    this.save.data.office.revision = this.meters.revision;
    this.saveOfficeSession();
    this.world.setStack(this.meters.revision + this.meters.attachments);
    this.audio.stamp();
    this.renderOffice();
    if (this.meters.revision >= 10) this.unlock("versions");
  }
  private filename() {
    const stamps = this.save.data.office.stamps;
    return stamps.length
      ? `${stamps.map((s) => s.replaceAll(" ", "_")).join("_")}_Schedule_v${this.meters.revision}.pdf`
      : "Schedule.pdf";
  }
  private craft(stamp: string) {
    if (this.screen !== "simulator") return;
    this.meters.revision = Math.min(50, this.meters.revision + 1);
    this.save.data.office.stamps.push(stamp);
    this.save.data.office.stamps = this.save.data.office.stamps.slice(-50);
    this.save.data.office.revision = this.meters.revision;
    this.saveOfficeSession();
    this.audio.stamp();
    this.world.setStack(this.meters.revision + this.meters.attachments);
    const name = document.getElementById("filename");
    if (name) name.textContent = this.filename();
    const count = document.getElementById("paper-count");
    if (count)
      count.textContent = `STACK ${this.meters.revision} · ATTACHMENTS ${this.meters.attachments}`;
    document
      .getElementById("craft-paper")
      ?.animate(
        [
          { transform: "translateY(-5px) rotate(-1deg)" },
          { transform: "translateY(0)" },
        ],
        { duration: this.save.data.settings.reducedFlashing ? 100 : 240 },
      );
    if (this.meters.revision >= 10) this.unlock("versions");
  }
  private officeEnd() {
    this.save.data.office.session = null;
    this.save.data.office.day++;
    this.save.data.stats.officeDays++;
    this.save.data.stats.bestClarity = Math.max(
      this.save.data.stats.bestClarity,
      this.meters.clarity,
    );
    if (this.meters.clarity >= 80) this.unlock("professional");
    this.results(
      "OFFICE CLOSED.\nINBOX OPEN.",
      "Eight decisions have entered the official record.",
      [
        ["Clarity", `${this.meters.clarity}%`],
        ["Authority", `${this.meters.authority}%`],
        ["Revision stack", String(this.meters.revision)],
      ],
      this.meters.clarity >= 80
        ? "Students understood your emails. Please report this unusual incident."
        : "Tomorrow offers a fresh opportunity to revise today.",
    );
  }
  private renderInbox() {
    this.inboxResolved = false;
    this.inboxLatest = this.inboxRound * 4 + 4;
    this.inboxOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    this.world.setStack(this.inboxRound + 1);
    const names = [
      "FINAL. PLEASE DO NOT IGNORE.",
      "Revised Final Schedule",
      "FINAL_FINAL_THIS_ONE.pdf",
      "Correction: current examination schedule",
    ];
    this.root.innerHTML = `${this.header(true)}<div class="office-heading"><p class="eyebrow">INBOX PANIC · PANIC OPTIONAL</p><h2>Read the evidence.<br>Not the volume.</h2><p class="mini-instruction">Newest time + highest version = current.<br>“Final” is just someone's emotional state.</p></div><main class="mini-panel"><div class="mini-top"><span class="eyebrow">${this.inboxTimed ? "60-SECOND SPRINT" : "QUIET FILING · NO TIMER"}</span><strong id="inbox-clock">${this.inboxTimed ? `${Math.ceil(this.inboxTime)}s` : `${this.inboxRound + 1} / 6`}</strong></div><h3>Which schedule is current?</h3><div class="inbox-status"><span>${this.inboxScore} current versions pinned</span><span>${this.inboxMistakes} old copies archived</span></div><div class="inbox-list">${this.inboxOrder
      .map((i) => {
        const version = this.inboxRound * 4 + i + 1;
        const minutes = 9 * 60 + version * 3;
        return `<button data-action="inbox-choice" data-version="${version}"><span class="mail-avatar">R</span><span><small>UPR · Office of The Registrar <time>${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}</time></small><strong>${names[i]}</strong><em>📎 Schedule_v${version}.pdf <b>VERSION ${version}</b></em></span></button>`;
      })
      .join(
        "",
      )}</div><div id="inbox-feedback" class="mini-feedback" role="status" aria-live="polite"></div><p class="mini-footnote">All four emails are from today. Reading an old version costs nothing.</p></main>`;
  }
  private inboxChoice(version: number, button: HTMLButtonElement) {
    if (
      this.screen !== "inbox" ||
      this.paused ||
      button.disabled ||
      this.inboxResolved
    )
      return;
    const feedback = document.getElementById("inbox-feedback")!;
    if (version === this.inboxLatest) {
      this.audio.collect();
      this.inboxScore++;
      this.inboxResolved = true;
      button.classList.add("current-mail");
      document
        .querySelectorAll<HTMLButtonElement>('[data-action="inbox-choice"]')
        .forEach((b) => {
          b.disabled = true;
        });
      feedback.innerHTML = `<div class="filing-receipt"><span class="eyebrow">CURRENT VERSION PINNED · ROOM ${rooms[(this.inboxRound + 1) % 3]}</span><p>${inboxReceipts[this.inboxRound % inboxReceipts.length]}</p><button data-action="inbox-next">${!this.inboxTimed && this.inboxRound === 5 ? "Close the inbox" : "Next batch"} ${icons.arrow}</button></div>`;
    } else {
      this.inboxMistakes++;
      this.save.data.stats.obsolete++;
      button.disabled = true;
      button.classList.add("obsolete");
      button.querySelector("strong")!.textContent =
        "ARCHIVED · A newer version exists.";
      feedback.innerHTML = `<p>${obsoleteJokes[(this.inboxMistakes - 1) % obsoleteJokes.length]}<br><strong>Look for the latest time. Try another email.</strong></p>`;
      this.audio.tone(330, 0.1, 0.07);
      if (this.save.data.stats.obsolete >= 5) this.unlock("archaeologist");
      this.save.write();
    }
    document.querySelector(".inbox-status")!.innerHTML =
      `<span>${this.inboxScore} current versions pinned</span><span>${this.inboxMistakes} old copies archived</span>`;
  }
  private finishInbox() {
    this.save.data.stats.inboxBest = Math.max(
      this.save.data.stats.inboxBest,
      this.inboxScore,
    );
    this.results(
      "INBOX,\nUNDER CONTROL.",
      this.inboxTimed
        ? "Your filing sprint is complete. No unread email can hurt you here."
        : "Six batches sorted. You may now enjoy a completely unauthorized break.",
      [
        ["Current versions pinned", String(this.inboxScore)],
        ["Old copies archived", String(this.inboxMistakes)],
      ],
      "Understanding the evidence beat memorizing the filename. Imagine that.",
    );
  }
  private renderRoulette() {
    this.rouletteRevealed = false;
    this.rouletteAttempts = 0;
    this.rouletteAnswer = this.rouletteOrder[this.rouletteRound];
    const file = attachmentCases[this.rouletteAnswer];
    this.world.setStack(this.rouletteRound + 1);
    this.unlock("knows");
    const choices = [
      this.rouletteAnswer,
      (this.rouletteAnswer + 1) % 8,
      (this.rouletteAnswer + 3) % 8,
      (this.rouletteAnswer + 5) % 8,
    ].sort(() => Math.random() - 0.5);
    this.root.innerHTML = `${this.header(true)}<div class="office-heading"><p class="eyebrow">ATTACHMENT ROULETTE</p><h2>The subject is useless.<br>The clues aren't.</h2><p class="mini-instruction">Read the preview. Identify the document.<br>No timer. Free hints. Unlimited second thoughts.</p></div><main class="mini-panel roulette-panel"><div class="mini-top"><span class="eyebrow">MYSTERY DOCUMENT</span><span>${String(this.rouletteRound + 1).padStart(2, "0")} / 08</span></div><div class="mystery-mail"><span class="eyebrow">FROM UPR · OFFICE OF THE REGISTRAR</span><h3>Notification</h3><p>Please find attached.</p><div class="attachment-file">${icons.clip}<span>pdf${9526 + this.rouletteRound * 137}.pdf<small>PDF DOCUMENT · NAMED BY A PRINTER, APPARENTLY</small></span></div><div class="file-preview"><span class="eyebrow">A GLIMPSE OF PAGE ONE</span><strong>${file.preview}</strong></div></div><p class="guess-label">Which department of paperwork is this?</p><div class="guess-grid">${choices.map((i) => `<button data-action="roulette-choice" data-index="${i}">${attachmentCases[i].category}</button>`).join("")}</div><div id="attachment-feedback" class="mini-feedback" role="status" aria-live="polite"></div><button class="context-button" data-action="context">Request actual context <span>FREE · REVOLUTIONARY</span></button><p class="mini-footnote">The filename is unhelpful. Page one has filed a dissent.</p></main>`;
  }
  private attachmentHint() {
    if (this.screen !== "roulette" || this.rouletteRevealed) return;
    document.getElementById("attachment-feedback")!.innerHTML =
      `<p><strong>A reluctant clarification:</strong><br>${attachmentCases[this.rouletteAnswer].hint}</p>`;
  }
  private rouletteChoice(index: number) {
    if (this.screen !== "roulette" || this.rouletteRevealed || this.paused)
      return;
    const file = attachmentCases[this.rouletteAnswer];
    if (index !== this.rouletteAnswer) {
      this.rouletteAttempts++;
      const button = document.querySelector<HTMLButtonElement>(
        `[data-action="roulette-choice"][data-index="${index}"]`,
      );
      if (button) {
        button.disabled = true;
        button.classList.add("eliminated");
      }
      document.getElementById("attachment-feedback")!.innerHTML =
        `<p>Reasonable suspicion. Different paperwork.<br><strong>${file.hint}</strong><br>No penalty. Choose again.</p>`;
      return;
    }
    this.rouletteRevealed = true;
    this.world.attachmentFlip = 0.8;
    this.openAttachment(1);
    this.audio.stamp();
    if (this.rouletteAttempts === 0) {
      this.rouletteCorrect++;
      this.save.data.stats.rouletteCorrect++;
      this.save.write();
    }
    document.querySelector(".guess-grid")!.innerHTML =
      `<div class="attachment-reveal"><span class="eyebrow">DEDUCED, NOT MEMORIZED</span><h3>${file.category}</h3><p>${file.reveal}</p><button class="play-button" data-action="roulette-next">${this.rouletteRound === 7 ? "File the results" : "Next attachment"} ${icons.arrow}</button></div>`;
    document.getElementById("attachment-feedback")!.innerHTML = "";
    document.querySelector(".context-button")?.remove();
  }
  private openAttachment(count: number) {
    this.save.data.stats.attachments += count;
    if (this.save.data.stats.attachments >= 25) this.unlock("attached");
    this.save.write();
  }
  private unlock(id: string) {
    if (this.save.unlock(id)) {
      const a = achievements.find((a) => a[0] === id);
      if (a) this.toastQueue.push(`Achievement unlocked · ${a[1]}`);
    }
  }
  private toast(text: string) {
    const el = document.getElementById("toast")!;
    el.textContent = text;
    el.classList.add("visible");
    this.toastUntil = this.time + 4;
  }
  private pause() {
    if (this.dialog) return;
    this.openDialog(
      `<p class="eyebrow">TEMPORARILY ADJOURNED</p><h2>The emails can wait.</h2><p>Your place is saved here. Take your time.</p><button class="play-button" data-action="resume">Resume ${icons.arrow}</button><button class="text-button" data-action="home">← Back to campus</button><button class="text-button restart-button" data-action="restart">Restart this mode ↻</button>`,
    );
  }
  private openDialog(content: string, className = "") {
    if (this.dialog) this.closeDialog();
    this.wasPaused = this.paused;
    this.paused = true;
    this.updateHUD();
    this.focusBefore =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    const d = document.createElement("dialog");
    d.className = `modal ${className}`;
    d.innerHTML = `<button class="dialog-close" data-action="close" aria-label="Close dialog">×</button>${content}`;
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.closeDialog();
    });
    document.body.append(d);
    this.dialog = d;
    d.showModal();
  }
  private closeDialog() {
    if (!this.dialog) return;
    this.dialog.close();
    this.dialog.remove();
    this.dialog = undefined;
    this.paused = this.wasPaused;
    if (!this.paused && this.screen === "survival" && this.run) {
      this.run.slowUntil = Math.max(this.run.slowUntil, this.run.elapsed + 1.2);
      this.run.graceUntil = Math.max(
        this.run.graceUntil,
        this.run.elapsed + 1.2,
      );
    }
    document.body.classList.remove("legendary");
    this.focusBefore?.focus();
  }
  private settings() {
    const s = this.save.data.settings;
    this.openDialog(
      `<p class="eyebrow">PERSONAL ADMINISTRATION</p><h2>Your kind of chaos.</h2><div class="settings-form"><label class="setting-select">Chaos level<select data-setting="chaosLevel"><option value="relaxed" ${s.chaosLevel === "relaxed" ? "selected" : ""}>Relaxed · more breathing room</option><option value="normal" ${s.chaosLevel === "normal" ? "selected" : ""}>Normal · the intended chaos</option><option value="unhinged" ${s.chaosLevel === "unhinged" ? "selected" : ""}>Unhinged · still fair, more paperwork</option></select><small>Applies to your next run.</small></label>${(["masterVolume", "musicVolume", "notificationVolume"] as const).map((k, i) => `<label class="volume-setting"><span>${["Master volume", "Music volume", "Notification volume"][i]}<output>${Math.round(s[k] * 100)}%</output></span><input aria-label="${["Master volume", "Music volume", "Notification volume"][i]}" type="range" min="0" max="1" step="0.05" value="${s[k]}" data-setting="${k}"></label>`).join("")}<div class="toggle-settings">${(["reducedShake", "reducedFlashing", "largeText", "highContrast"] as const).map((k, i) => `<label>${["Reduced screen shake", "Reduced flashing", "Large text", "High contrast"][i]}<input type="checkbox" data-setting="${k}" ${s[k] ? "checked" : ""}><span class="switch"></span></label>`).join("")}</div></div><p class="quiet">Preferences save automatically on this device.</p><button class="play-button" data-action="close">All set ${icons.arrow}</button>`,
      "settings-modal",
    );
  }
  private setting(e: Event) {
    const target = e.target as HTMLInputElement;
    const key = target.dataset.setting as keyof Settings | undefined;
    if (!key) return;
    const settings = this.save.data.settings;
    if (key === "chaosLevel") {
      if (
        target.value === "relaxed" ||
        target.value === "normal" ||
        target.value === "unhinged"
      )
        settings[key] = target.value;
    } else if (
      key === "masterVolume" ||
      key === "musicVolume" ||
      key === "notificationVolume"
    ) {
      settings[key] = Number(target.value);
      const output = target.parentElement?.querySelector("output");
      if (output)
        output.textContent = `${Math.round(Number(target.value) * 100)}%`;
    } else settings[key] = target.checked;
    this.save.write();
    this.applySettings();
  }
  private applySettings() {
    const s = this.save.data.settings;
    document.body.classList.toggle("large-text", s.largeText);
    document.body.classList.toggle("high-contrast", s.highContrast);
    document.body.classList.toggle("reduced-motion", s.reducedFlashing);
  }
  private showAchievements() {
    this.openDialog(
      `<p class="eyebrow">YOUR PERMANENT RECORD</p><h2>Officially unofficial.</h2><p>${this.save.data.achievements.length} of ${achievements.length} achievements filed.</p><div class="achievement-list">${achievements.map(([id, title, text]) => `<div class="achievement ${this.save.data.achievements.includes(id) ? "unlocked" : ""}"><span>${this.save.data.achievements.includes(id) ? "✓" : "◇"}</span><div><strong>${title}</strong><small>${text}</small></div></div>`).join("")}</div>`,
      "achievements-modal",
    );
  }
  private legend() {
    if (this.time - this.cgpaAt > 4) this.cgpaClicks = 0;
    this.cgpaAt = this.time;
    this.cgpaClicks++;
    if (this.cgpaClicks < 5) return;
    this.cgpaClicks = 0;
    this.unlock("legend");
    this.openDialog(
      '<p class="eyebrow">THE OFFICE WOULD LIKE A WORD</p><h2 class="legend-text">In IUT,<br><em>CGPA matters.</em></h2><div class="legend-stamp">THE LEGEND</div><p>Some policies are not subject to revision.</p><button class="play-button" data-action="close">Duly noted.</button>',
      "legend-modal",
    );
    document.body.classList.add("legendary");
    this.audio.stamp();
  }
}
