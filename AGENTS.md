# AGENTS.md

A DevRel engineer uploads a recording; the agent suggests animations, zooms, cuts and captions, shows each as a GIF, and renders the human's picks.

- **Animating a video, or applying review picks** → follow `.claude/skills/animate-video/SKILL.md`.
- **What makes a suggestion good** → `editorial/STANDARD.md` (one page).
- **Tests:** `npm test` (browser and ffmpeg tests skip if those aren't installed). `npm run demo` runs the pipeline on a synthetic video.

## Conventions

- Plain Node ESM, no build step. Scripts in `scripts/` export their main function and also run as CLIs.
- All edit times are source-video time; all coordinates are design pixels (short side = 1080).
- Templates only build entrances and reveals; the stage adds the exit. Use the helpers in `templates/motion.js`.
- Validation (`lib/edl.js`) only catches what would break a render or be unreadable; judgment belongs to the suggester and the reviewer.
- After changing a template, render it and look at it. Placement problems only show up visually.
- Keep it small. Before adding a stage, a rule or a dependency, ask whether the reviewer would notice its absence.
