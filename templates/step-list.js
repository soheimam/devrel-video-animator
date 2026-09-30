// step-list: a sequence that builds as the presenter walks through it, and stays up while
// the steps are done. The current step is emphasised; earlier ones recede.
// params: { title?, steps: [ "text" | { text, at? } ] }   cue.anchor (optional).
import { el, appear, place, corner, STEP, ENTER } from './motion.js';

export function build(ctx) {
  const { root, params, anchor, tl, at } = ctx;
  const panel = el('div', 'panel');
  panel.dataset.box = 'step list';
  if (params.title) panel.append(el('div', 'title', params.title));
  const list = el('ol', 'steps');
  const rows = params.steps.map((s, i) => {
    const row = el('li', 'step');
    row.append(el('span', 'badge', String(i + 1)), el('span', '', typeof s === 'string' ? s : s.text));
    list.append(row);
    return row;
  });
  panel.append(list);
  root.append(panel);

  if (anchor) place(panel, anchor, ctx);
  else corner(panel, ctx, 'top-right');

  appear(tl, panel, 0, { y: 0 });
  let prev = null;
  params.steps.forEach((s, i) => {
    const t = at(typeof s === 'string' ? undefined : s.at, 200 + i * STEP);
    appear(tl, rows[i], t);
    if (prev) tl.add(prev, { opacity: [1, 0.5], duration: ENTER }, t);
    prev = rows[i];
  });
}
