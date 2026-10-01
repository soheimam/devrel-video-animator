# What makes an animation worth adding

How it should *look* is in `STYLE.md`. This page is about *when*.

The test for every suggestion: **would a viewer understand or find something they otherwise wouldn't?** If yes, suggest it. If it's only there to look lively, don't. The reviewer makes the final call, so when in doubt, suggest and say why you doubt.

## Where animations help

- **Said but not shown.** The presenter describes an architecture, a request path, a sequence of steps, a state change. Draw it (`flow-diagram`, `step-list`). This is the most valuable kind of animation in a developer video.
- **A new term.** Used without a definition on screen, and a newcomer would stumble. A short card at the first mention (`term-definition`): the term and a few words, never a sentence from the narration.
- **Shown but hard to find or read.** Small text, one line among fifty, a value in a dense panel. Make it readable (`zoom`) or make it stand out (`code-focus`, `highlight-region`, `callout` anchored to it).
- **A contrast.** Before/after, A vs B (`comparison`). An animated counter is decoration; a side-by-side is information.

## How they should behave

- Appear on the word they relate to, not a sentence later.
- Sit next to the thing they describe. Never cover the code being discussed, the terminal output, or the presenter's face. Never enter the bottom 15% (captions).
- Stay up long enough to read (about 1s + 0.3s per word), and leave when the narration moves on.
- Motion means something: appearing = new, direction = flow, one pulse = look here. No loops, no bounce, no logos.
- Text is on solid panels, 32 design px or larger, spelled as it appears on screen. No numbers or facts the video doesn't contain.

## Cuts

Remove silence and mistakes, never content: the lead-in before the first word, dead air on an unchanging screen, false starts, the tail after the sign-off; shorten long waits. Keep the time a viewer needs to read what's on screen. Boundaries go in silence.

## Captions

Every video gets them, burned in and as SRT/VTT. Many people watch muted.
