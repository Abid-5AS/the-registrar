# Verification record

Tested on 9 September 2026 against the built static game served at `/registrar-simulator/` using a plain HTTP file server.

## Automated results

- Strict TypeScript compilation: passed.
- Vite production build: passed. The complete `dist/` is approximately 670 KB on disk. The JavaScript bundle is approximately 158 KB gzip. Vite emits an advisory size warning because Three.js is bundled in the main chunk.
- 15 unit tests: passed. They cover lane bounds/easing, jump/slide physics, shield consumption, collision grace, three-hit failure, safe revision windows in all three chaos levels, wrong-room forgiveness, screenshot schedule locks, open-lane guarantees, obstacle collision distinctions, boss telegraphs/endings, frozen game-over state, save recovery, and validation of resumable office sessions.
- Production browser suite: passed all 19 checks. Keyboard controls, pause/resume, all four complete mode loops, stamp drag/drop and tapping, high-clarity office progression, persisted settings, achievements, CGPA easter egg, corrupt saves, exact office-session resumption, fullscreen, clue-based attachment deduction, free hints, repeated wrong-answer recovery, quiet inbox completion, responsive layouts, and touch controls were exercised.
- No uncaught browser exceptions, console errors, or failed asset requests in that suite.
- Separate deterministic browser checks verify the first live revision, explicit Room 301 → 402 notice, matching route arrow, safe arrival with all three cards, and the optional 60-second inbox sprint ending.

## Visual inspection

Rendered screenshots inspected at desktop and emulated mobile sizes, including 1440×900, 1280×800, 390×844 portrait, and 844×390 landscape. Checked the poster-style menu, 3D campus, runner, office, attachment interface, inbox, achievements, and accessible touch targets.

A desktop menu sample reported 60 FPS in headless Chrome on this machine. This is a sample, not a performance guarantee for every device or late-game scene. The renderer caps pixel ratio at 1.6, uses a single shadow-casting light, instanced building geometry, shared materials, and bounded prop/particle pools.

## Practical limits

- Mobile inputs and resizing were tested through Chrome's touch/mobile emulation; a physical iPhone/Android device and Safari were not tested.
- Later boss timing and mechanics are covered in the pure simulation tests. The browser run explicitly covers the first revision, rather than a manual uninterrupted multi-minute endurance session.
- The GitHub Actions workflow and static repository-subpath behavior are provided and checked locally. An actual remote GitHub deployment has not been performed.
- Office scenarios are handcrafted rather than procedurally generated; repeat days revisit the eight scenarios.
- Completed progress and partial office days are persisted. Runner and inbox/attachment rounds restart after a refresh.

The game deliberately uses a fictional university, generic course code, fictional staff, and no real student identifiers. Satire concerns institutional incentives and contradictions, rather than factual allegations about identifiable people.
