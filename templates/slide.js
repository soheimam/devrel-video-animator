// slide: a full-frame explainer in the Base style (editorial/STYLE.md, references/). Replaces
// the recording for a few seconds: blue header band with the title and the base wordmark,
// then up to three numbered columns, each a heading, a card and an optional note.
//
// params: {
//   title,
//   columns: [{ heading, pill?, lines?: [string | { mono: string }], note?, at? }],
//   summary?: "SIGN → WAIT → INCLUDE"   // the bracketed takeaway line under the columns (reference 3)
// }
// Columns appear in order (on their `at` word if given). No anchor: it is the whole frame.
import { el, appear, pop, equalize, hidden, STEP } from './motion.js';

export function build(ctx) {
  const { root, params, tl, at } = ctx;
  const slide = el('div', 'slide');
  const head = el('div', 'slide-head');
  const title = el('div', 'slide-title', params.title);
  head.append(title);
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
  const summary = params.summary ? el('div', 'slide-summary', `[ ${params.summary} ]`) : null;
  if (summary) slide.append(summary);
  root.append(slide);
  equalize(slide.querySelectorAll('.card'), { width: false });

  // The field fades up, the header drops in, columns follow one by one and their pills pop.
  appear(tl, slide, 0, { y: 0, scale: 1, duration: 350, ease: 'outQuad' });
  appear(tl, head, 120, { y: -40, scale: 1, duration: 650, ease: 'outExpo' });
  // Overlapping action: the band lands, then the title slides into it and the mark follows.
  hidden(title, mark);
  tl.add(title, { opacity: [0, 1], translateX: [-28, 0], duration: 520, ease: 'outQuint' }, 320);
  tl.add(mark, { opacity: [0, 1], duration: 400, ease: 'outQuad' }, 520);
  let last = 0;
  params.columns.slice(0, 3).forEach((c, i) => {
    const t = at(c.at, 600 + i * STEP);
    appear(tl, built[i], t, { y: 28, scale: 0.97 });
    const pill = built[i].querySelector('.pill');
    if (pill) pop(tl, pill, t + 250);
    last = Math.max(last, t);
  });
  // The takeaway lands once every column has: the last thing to read.
  if (summary) appear(tl, summary, last + 700, { y: 16, scale: 1 });
}
