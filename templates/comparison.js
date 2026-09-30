// comparison: puts two states side by side so the difference is visible
// (before/after, A vs B). Replaces "animated counter" stats, which are decoration.
// params: { left: { title, items[] }, right: { title, items[], at? } }   cue.anchor (optional).
import { el, appear, place, corner } from './motion.js';

function column(side) {
  const col = el('div', 'column');
  col.append(el('div', 'title', side.title));
  const list = el('ul');
  const items = (side.items || []).map((text) => {
    const li = el('li', '', text);
    list.append(li);
    return li;
  });
  col.append(list);
  return { col, items };
}

export function build(ctx) {
  const { root, params, anchor, tl, at } = ctx;
  const panel = el('div', 'panel');
  panel.style.maxWidth = '1400px';
  panel.dataset.box = 'comparison';
  const wrap = el('div', 'compare');
  const left = column(params.left);
  const right = column(params.right);
  wrap.append(left.col, el('div', 'divider'), right.col);
  panel.append(wrap);
  root.append(panel);

  if (anchor) place(panel, anchor, ctx);
  else corner(panel, ctx, 'top-left');

  appear(tl, panel, 0, { y: 0 });
  left.items.forEach((li, i) => appear(tl, li, 150 + i * 150));
  const tr = at(params.right.at, 900);
  appear(tl, right.col, tr);
  right.items.forEach((li, i) => appear(tl, li, tr + 150 + i * 150));
}
