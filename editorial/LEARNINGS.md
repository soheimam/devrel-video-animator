# Learnings from human review

Human review notes are the ground truth for quality. When a note reveals a *pattern* (not a one-off), record it here so that every future edit benefits. When a learning has held up across several videos, promote it into `STANDARD.md` (or a threshold in `rules.yaml`) and mark it promoted.

Format:

```
## YYYY-MM-DD: <short title>
- Video: out/<video>
- Note: what the reviewer said (quote it)
- Pattern: the general rule it implies
- Status: new | promoted to STANDARD.md §N | promoted to rules.yaml
```

---

## 2026-09-30: An edit must visibly improve the video
- Video: out/vibetnet-opus (PR #9) and out/vibetnet-sonnet (PR #8)
- Note: "No animations were added for the video at all… and no close captions either even though we had video transcript. And no editing." Also: "I can't give feedback if I can't see the video with animations."
- Pattern: (1) captions on every video; (2) a tightening pass on every video; (3) under uncertainty, surface candidates for the reviewer instead of rejecting everything, since an empty edit gives the reviewer nothing to judge; (4) review PRs must show the animations (GIF per cue) and include the edited video.
- Status: promoted to STANDARD.md §0, §5a and §6, to the critic and editor roles, and to the skill's hand-over step.
