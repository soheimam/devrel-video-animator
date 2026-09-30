// Shared motion vocabulary. Restraint is the point: short entrances, one easing family,
// no bounce, no loops. Motion should mean something (appearing = new, direction = flow).
export const ENTER = 300;
export const EXIT = 250;
export const STEP = 650;
export const EASE = 'outCubic';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function hidden(...nodes) {
  for (const n of nodes) n.style.opacity = 0;
}

export function appear(tl, target, at, { y = 14, duration = ENTER } = {}) {
  hidden(target);
  const params = { opacity: [0, 1], duration, ease: EASE };
  if (y && !(target instanceof SVGElement)) params.translateY = [y, 0];
  tl.add(target, params, at);
}

export function fadeIn(tl, target, at, duration = ENTER) {
  hidden(target);
  tl.add(target, { opacity: [0, 1], duration, ease: EASE }, at);
}

// Draws an SVG stroke from its start, like a pen.
export function draw(tl, path, at, duration = 450) {
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  tl.add(path, { strokeDashoffset: [len, 0], duration, ease: 'inOutQuad' }, at);
}

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// Positions an absolutely placed element near (x, y), kept inside the safe area: away
// from the frame edges and out of the caption zone at the bottom.
export function place(node, { x, y }, ctx) {
  const { design, layout } = ctx;
  const r = node.getBoundingClientRect();
  const bottom = design.h * (1 - layout.caption_zone) - layout.margin;
  node.style.left = `${clamp(x, layout.margin, design.w - layout.margin - r.width)}px`;
  node.style.top = `${clamp(y, layout.margin, bottom - r.height)}px`;
  return { left: parseFloat(node.style.left), top: parseFloat(node.style.top), w: r.width, h: r.height };
}

// Default spot for panels that don't need to point at anything.
export function corner(node, ctx, where = 'top-right') {
  const { design, layout } = ctx;
  const r = node.getBoundingClientRect();
  const m = layout.margin * 1.5;
  const x = where.endsWith('left') ? m : design.w - m - r.width;
  const y = where.startsWith('top') ? m : design.h * (1 - layout.caption_zone) - layout.margin - r.height;
  return place(node, { x, y }, ctx);
}
