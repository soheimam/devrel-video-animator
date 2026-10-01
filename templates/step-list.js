// step-list: a sequence that builds as the presenter walks through it, and stays up while
// the steps are done. The current step is emphasised; earlier ones recede.
// params: { title?, steps: [ "text" | { text, at? } ] }   cue.anchor (optional).
import { el, appear, place, corner, hidden, STEP, ENTER, EASE } from './motion.js';

export function build(ctx) {
  const { root, params, anchor, tl, at } = ctx;
  const panel = el('div', 'panel');
  panel.dataset.box = 'step list';
  if (params.title) panel.append(el('div', 'title', params.title));
  const list = el('ol', 'steps');
  const rows = params.steps.map((s, i) => {
    const row = el('li', 'step');
    const num = el('span', 'num', `${String(i + 1).padStart(2, '0')} /`);
    const text = el('span', '', typeof s === 'string' ? s : s.text);
    row.append(num, text);
    list.append(row);
    return { row, num, text };
  });
  panel.append(list);
  root.append(panel);

  if (anchor) place(panel, anchor, ctx);
  else corner(panel, ctx, 'top-right');

  appear(tl, panel, 0);
  // Anticipation (editorial/MOTION.md): the number lands first, the text follows 130ms later.
  // Secondary action: the previous step recedes as the next one arrives.
  let prev = null;
  params.steps.forEach((s, i) => {
    const t = at(typeof s === 'string' ? undefined : s.at, 300 + i * STEP);
    const { row, num, text } = rows[i];
    appear(tl, row, t, { y: 0, scale: 1, duration: 200, ease: 'outQuad' });
    appear(tl, num, t, { y: 0, scale: 0.8, duration: 450 });
    hidden(text);
    tl.add(text, { opacity: { to: [0, 1], duration: 250, ease: 'outQuad' }, translateX: [-18, 0], duration: ENTER, ease: EASE }, t + 130);
    if (prev) tl.add(prev, { opacity: [1, 0.5], duration: ENTER }, t);
    prev = row;
  });
}
