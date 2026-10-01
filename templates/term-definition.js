// term-definition: keeps a new term and a short gloss on screen while the viewer needs it.
// The term is a blue pill, the gloss plain text below (editorial/STYLE.md).
// params: { term, gloss }   cue.anchor (optional): top-left of the card.
import { el, appear, place, corner } from './motion.js';

export function build(ctx) {
  const { root, params, anchor, tl } = ctx;
  const panel = el('div', 'panel term-panel');
  panel.dataset.box = 'term panel';
  const term = el('div', 'term');
  term.append(el('span', 'pill', params.term));
  const gloss = el('div', 'gloss', params.gloss);
  panel.append(term, gloss);
  root.append(panel);

  if (anchor) place(panel, anchor, ctx);
  else corner(panel, ctx, 'bottom-left');

  appear(tl, panel, 0, { y: 0 });
  appear(tl, term, 150);
  appear(tl, gloss, 450);
}
