import type { Settings } from "../types";
export class AudioManager {
  private ctx?: AudioContext;
  private nextNote = 0;
  private note = 0;
  constructor(private settings: () => Settings) {}
  start() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {
      /* Audio is optional. */
    }
  }
  tone(
    hz: number,
    duration = 0.12,
    volume = 0.15,
    type: OscillatorType = "sine",
    music = false,
  ) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const s = this.settings();
    const gain = ctx.createGain();
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(hz, ctx.currentTime);
    const peak =
      volume * s.masterVolume * (music ? s.musicVolume : s.notificationVolume);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  ping() {
    this.tone(740, 0.28, 0.16);
    this.tone(1109, 0.38, 0.065);
  }
  stamp() {
    this.tone(82, 0.24, 0.4, "triangle");
    this.tone(53, 0.17, 0.3, "sawtooth");
  }
  collect() {
    this.tone(880, 0.09, 0.13);
  }
  update(t: number, quiet: boolean) {
    if (quiet || t < this.nextNote) return;
    this.nextNote = t + 0.46;
    const notes = [
      261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23, 246.94, 293.66,
      392, 293.66, 261.63, 329.63, 523.25, 392,
    ];
    this.tone(notes[this.note++ % notes.length], 0.7, 0.13, "sine", true);
  }
}
