// flow-diagram: draws something the narration describes but the screen never shows.
// Arrows draw in the direction of flow; nodes appear as they are mentioned.
// params: { title?, nodes: [ "label" | { label, at? } ], direction?: "right" | "down", trace? }
// cue.anchor (optional): top-left of the panel.
import { el, svgEl, appear, draw, fadeIn, place, corner, ENTER } from './motion.js';

const HOP = 900;

export function build(ctx) {
  const { root, params, anchor, tl, at } = ctx;
  const down = params.direction === 'down';
  const panel = el('div', 'panel');
  panel.style.maxWidth = 'none'; // a row of nodes is wider than a text panel
  panel.dataset.box = 'flow diagram';
  if (params.title) panel.append(el('div', 'title', params.title));
  const flow = el('div', down ? 'flow down' : 'flow');
  panel.append(flow);

  const nodes = [];
  const arrows = [];
  params.nodes.forEach((n, i) => {
    if (i > 0) {
      const [w, h] = down ? [40, 64] : [84, 40];
      const svg = svgEl('svg', { class: 'arrow', width: w, height: h });
      const line = svgEl('path', {
        d: down ? `M20 6 L20 ${h - 16}` : `M8 20 L${w - 18} 20`,
      });
      const head = svgEl('path', {
        class: 'head',
        d: down ? `M11 ${h - 15} L20 ${h - 5} L29 ${h - 15}` : `M${w - 18} 11 L${w - 7} 20 L${w - 18} 29`,
      });
      svg.append(line, head);
      flow.append(svg);
      arrows.push({ line, head });
    }
    const node = el('div', 'node', typeof n === 'string' ? n : n.label);
    flow.append(node);
    nodes.push(node);
  });
  root.append(panel);

  if (anchor) place(panel, anchor, ctx);
  else corner(panel, ctx, 'top-right');

  appear(tl, panel, 0, { y: 0 });
  let last = 0;
  params.nodes.forEach((n, i) => {
    const t = Math.max(at(typeof n === 'string' ? undefined : n.at, 300 + i * HOP), i ? last + 500 : 0);
    if (i > 0) {
      draw(tl, arrows[i - 1].line, t - 450, 400);
      fadeIn(tl, arrows[i - 1].head, t - 80, 160);
    }
    appear(tl, nodes[i], t, { y: 0 });
    last = t;
  });

  // Optional: light up each node in order once everything is visible, to show the path
  // a request takes.
  if (params.trace) {
    const base = getComputedStyle(nodes[0]).backgroundColor;
    const lit = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim();
    let t = last + ENTER + 200;
    for (const node of nodes) {
      tl.add(node, { backgroundColor: [base, lit], color: ['#0a0b0d', '#ffffff'], duration: 260 }, t);
      tl.add(node, { backgroundColor: [lit, base], color: ['#ffffff', '#0a0b0d'], duration: 360 }, t + 300);
      t += 380;
    }
  }
}
