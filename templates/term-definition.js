// term-definition: keeps a new term and a short gloss on screen while the viewer needs it.
// Show the term and its meaning, not the sentence being spoken (redundancy principle).
// params: { term, gloss }   cue.anchor (optional): top-left of the panel.
import { el, appear, place, corner } from './motion.js';

export function build(ctx) {
  const { root, params, anchor, tl } = ctx;
  const panel = el('div', 'panel term-panel');
  panel.dataset.box = 'term panel';
  const bar = el('div', 'term-bar');
  const term = el('div', 'term', params.term);
  const gloss = el('div', 'gloss', params.gloss);
  panel.append(bar, term, gloss);
  root.append(panel);

  if (anchor) place(panel, anchor, ctx);
  else corner(panel, ctx, 'bottom-left');

  appear(tl, panel, 0, { y: 0, duration: 250 });
  tl.add(bar, { scaleY: [0, 1], duration: 300 }, 0);
  appear(tl, term, 120);
  appear(tl, gloss, 320);
}
