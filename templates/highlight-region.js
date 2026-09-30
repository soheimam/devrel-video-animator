// highlight-region: outlines an area of the screen so the viewer can find it.
// params: { region: { x, y, w, h }, label? }
import { el, svgEl, appear, draw, place, fadeIn } from './motion.js';

export function build(ctx) {
  const { root, params, tl, design } = ctx;
  const { x, y, w, h } = params.region;
  const pad = 10;
  const svg = svgEl('svg', { class: 'layer', width: design.w, height: design.h });
  const outline = svgEl('rect', {
    class: 'outline', x: x - pad, y: y - pad, width: w + pad * 2, height: h + pad * 2, rx: 12,
  });
  const glow = svgEl('rect', {
    x: x - pad, y: y - pad, width: w + pad * 2, height: h + pad * 2, rx: 12,
    fill: 'var(--accent)', 'fill-opacity': 0.08,
  });
  svg.append(glow, outline);
  root.append(svg);

  draw(tl, outline, 0, 500);
  fadeIn(tl, glow, 200);

  if (params.label) labelNear(ctx, params.label, { x, y, w, h }, pad, 450);
}

// Labels go beside the region when there's room (code and UI are usually left-aligned, so
// the right side is usually empty), otherwise above, otherwise below. Never on top of it.
export function labelNear(ctx, text, region, pad, at) {
  const { design, layout } = ctx;
  const label = el('div', 'panel label', text);
  label.dataset.box = 'region label';
  ctx.root.append(label);
  const { width, height } = label.getBoundingClientRect();
  const gap = 24;
  const rightX = region.x + region.w + pad + gap;
  const aboveY = region.y - pad - gap - height;
  let pos;
  if (rightX + width <= design.w - layout.margin) {
    pos = { x: rightX, y: region.y + region.h / 2 - height / 2 };
  } else if (aboveY >= layout.margin) {
    pos = { x: region.x - pad, y: aboveY };
  } else {
    pos = { x: region.x - pad, y: region.y + region.h + pad + gap };
  }
  place(label, pos, ctx);
  appear(ctx.tl, label, at);
}
