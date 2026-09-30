# AGENTS.md

Agents edit DevRel recordings. A human provides the MP4 and reviews the result before publishing. Everything in between is ours.

- **Editing a video, or handling review notes** → follow `.claude/skills/edit-video/SKILL.md`.
- **The quality bar** is `editorial/STANDARD.md`. Read it before proposing, critiquing or changing any edit logic or template.
- **Tests:** `npm test` (Node's built-in runner; the browser and ffmpeg tests skip if those aren't installed). `npm run demo` runs the full pipeline on a synthetic video.

## Conventions

- Plain Node ESM, no build step, no TypeScript. Scripts in `scripts/` export their main function and also run as CLIs (`isMain`).
- All edit times are source-video time; all coordinates are design pixels (short side = 1080).
- Templates only build entrances and reveals; the stage adds the exit. Use the motion helpers in `templates/motion.js`, not ad-hoc easing.
- Mechanical rules go in `lib/edl.js` (validation) with thresholds in `editorial/rules.yaml`. Judgment rules go in `STANDARD.md` for the critic.
- After changing a template, render it and look at it, not just the tests. Placement problems (a label covering the code it describes) only show up visually.
