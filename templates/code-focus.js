// code-focus: dims everything except the lines being discussed. Signalling by subtraction:
// it removes competition for attention instead of adding more on top.
// params: { region: { x, y, w, h }, label? }
import { svgEl, fadeIn } from './motion.js';
import { labelNear } from './highlight-region.js';

export function build(ctx) {
  const { root, params, tl, design } = ctx;
  const { x, y, w, h } = params.region;
  const pad = 8;
  const hx = x - pad, hy = y - pad, hw = w + pad * 2, hh = h + pad * 2;
  const svg = svgEl('svg', { class: 'layer', width: design.w, height: design.h });
  const dim = svgEl('path', {
    class: 'dim',
    d: `M0 0H${design.w}V${design.h}H0Z M${hx} ${hy}v${hh}h${hw}v${-hh}Z`,
  });
  const edge = svgEl('rect', { class: 'outline-thin', x: hx, y: hy, width: hw, height: hh, rx: 8 });
  svg.append(dim, edge);
  root.append(svg);

  fadeIn(tl, dim, 0, 400);
  fadeIn(tl, edge, 150);
  if (params.label) labelNear(ctx, params.label, { x, y, w, h }, pad, 400);
}
