// slide: a full-frame explainer in the Base style (editorial/STYLE.md, references/). Replaces
// the recording for a few seconds: blue header band with the title and the base wordmark,
// then up to three numbered columns, each a heading, a card and an optional note.
//
// params: {
//   title,
//   columns: [{ heading, pill?, lines?: [string | { mono: string }], note?, at? }],
// }
// Columns appear in order (on their `at` word if given). No anchor: it is the whole frame.
import { el, appear, STEP } from './motion.js';

export function build(ctx) {
  const { root, params, tl, at } = ctx;
  const slide = el('div', 'slide');
  const head = el('div', 'slide-head');
  head.append(el('div', 'slide-title', params.title));
  const mark = el('div', 'wordmark');
  mark.append(el('span', 'sq'), el('span', '', 'base'));
  head.append(mark);
  slide.append(head);

  const cols = el('div', 'slide-cols');
  const n = Math.min(params.columns.length, 3);
  cols.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  const built = params.columns.slice(0, 3).map((c, i) => {
    const col = el('div', 'slide-col');
    const kicker = el('div', 'kicker');
    kicker.append(el('b', '', `${String(i + 1).padStart(2, '0')} / `), document.createTextNode(c.heading || ''));
    col.append(kicker);
    const card = el('div', 'card');
    if (c.pill) {
      const row = el('div', '');
      row.append(el('span', 'pill', c.pill));
      card.append(row);
    }
    for (const line of c.lines || []) {
      card.append(typeof line === 'string' ? el('div', 'line', line) : el('div', 'line mono', line.mono));
    }
    col.append(card);
    if (c.note) col.append(el('div', 'slide-note', c.note));
    cols.append(col);
    return col;
  });
  slide.append(cols);
  root.append(slide);

  // The field and header come in together; columns follow one by one.
  appear(tl, slide, 0, { y: 0, duration: 350 });
  appear(tl, head, 100, { y: 0 });
  params.columns.slice(0, 3).forEach((c, i) => {
    appear(tl, built[i], at(c.at, 500 + i * STEP), { y: 18 });
  });
}
