// Shared motion vocabulary (editorial/STYLE.md). Entrances decelerate hard with a touch of
// overshoot, so elements arrive with weight instead of fading in flat. No elastic bounce,
// no loops. Motion should mean something (appearing = new, direction = flow).
export const ENTER = 550;
export const EXIT = 300;
export const STEP = 900;
export const EASE = 'outQuint';          // fast start, long settle
export const EASE_SETTLE = 'outBack(1.2)'; // slight overshoot for cards and nodes
export const EASE_DRAW = 'inOutQuart';   // arrows and leaders

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

// Entrance: rises and scales up slightly while fading in, settling with a little overshoot.
export function appear(tl, target, at, { y = 24, scale = 0.96, duration = ENTER, ease = EASE_SETTLE } = {}) {
  hidden(target);
  const params = { opacity: { to: [0, 1], duration: Math.min(duration, 350), ease: 'outQuad' }, duration, ease };
  if (!(target instanceof SVGElement)) {
    if (y) params.translateY = [y, 0];
    if (scale && scale !== 1) params.scale = [scale, 1];
  }
  tl.add(target, params, at);
}

// A pill or chip popping into place.
export function pop(tl, target, at, duration = 500) {
  hidden(target);
  tl.add(target, { opacity: { to: [0, 1], duration: 200 }, scale: [0.8, 1], duration, ease: 'outBack(1.5)' }, at);
}

export function fadeIn(tl, target, at, duration = ENTER) {
  hidden(target);
  tl.add(target, { opacity: [0, 1], duration, ease: EASE }, at);
}

// Draws an SVG stroke from its start, like a pen.
export function draw(tl, path, at, duration = 600) {
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  tl.add(path, { strokeDashoffset: [len, 0], duration, ease: EASE_DRAW }, at);
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

// Boxes in one diagram are the same size (editorial/STYLE.md): measure after layout, then
// give every box the largest width and/or height found.
export function equalize(nodes, { width = true, height = true } = {}) {
  const list = [...nodes];
  if (!list.length) return;
  const w = Math.max(...list.map((n) => n.getBoundingClientRect().width));
  const h = Math.max(...list.map((n) => n.getBoundingClientRect().height));
  for (const n of list) {
    n.style.boxSizing = 'border-box';
    if (width) n.style.minWidth = `${Math.ceil(w)}px`;
    if (height) n.style.minHeight = `${Math.ceil(h)}px`;
  }
}
