// callout: a short label connected to the exact element it describes (spatial contiguity).
// params: { text, side?: "left" | "right" }   cue.anchor: { x, y }, the point being described.
//
// The label sits diagonally away from the point, never on the same row, so it can't cover
// the line of code or UI it is describing.
import { el, svgEl, appear, fadeIn, draw, place, clamp, hidden } from './motion.js';

export function build(ctx) {
  const { root, params, anchor, tl, design, layout } = ctx;
  const svg = svgEl('svg', { class: 'layer', width: design.w, height: design.h });
  const label = el('div', 'panel label', params.text);
  label.dataset.box = 'callout label';
  root.append(svg, label);

  const { width, height } = label.getBoundingClientRect();
  const reachX = 90;
  const reachY = 70;
  // Right by default: code and UI are usually left-aligned, so the right side is emptier.
  const toLeft = params.side
    ? params.side === 'left'
    : anchor.x + reachX + width > design.w - layout.margin;
  // Above the point if there's room, otherwise below it.
  const above = anchor.y - reachY - height >= layout.margin;
  const box = place(
    label,
    {
      x: toLeft ? anchor.x - reachX - width : anchor.x + reachX,
      y: above ? anchor.y - reachY - height : anchor.y + reachY,
    },
    ctx,
  );

  // Leader runs from the point to the label's nearest bottom (or top) corner region.
  const endX = clamp(toLeft ? box.left + box.w - 24 : box.left + 24, box.left, box.left + box.w);
  const endY = above ? box.top + box.h : box.top;
  const leader = svgEl('path', { class: 'leader', d: `M${anchor.x} ${anchor.y} L${endX} ${endY}` });
  const ring = svgEl('circle', { class: 'ring', cx: anchor.x, cy: anchor.y, r: 12 });
  const dot = svgEl('circle', { class: 'dot', cx: anchor.x, cy: anchor.y, r: 10 });
  svg.append(leader, ring, dot);

  fadeIn(tl, dot, 0, 200);
  // One ring pulse to pull the eye to the point. Once, never looping.
  hidden(ring);
  tl.add(ring, { r: [12, 46], opacity: [0.9, 0], duration: 700, ease: 'outQuad' }, 0);
  draw(tl, leader, 120, 300);
  appear(tl, label, 320);
}
