// The stage loads one template, builds its anime.js timeline paused, and lets the renderer
// seek frame by frame. Seeking (never playing) makes every render deterministic.
import { createTimeline } from 'animejs';
import { parseTime } from '/lib/time.js';
import { EXIT, ENTER, EASE } from './motion.js';

const root = document.getElementById('root');

window.stage = {
  tl: null,
  ctx: null,

  async load(spec) {
    const { template, params = {}, anchor, duration, cueStart = 0, design, layout } = spec;
    document.body.style.width = `${design.w}px`;
    document.body.style.height = `${design.h}px`;
    root.innerHTML = '';
    root.style.opacity = '';
    await document.fonts.ready;

    const mod = await import(`./${template}.js`);
    const durationMs = duration * 1000;
    const tl = createTimeline({ autoplay: false, defaults: { ease: EASE, duration: ENTER } });
    // Converts an absolute source timecode to ms since the cue started.
    const at = (timecode, fallbackMs) =>
      timecode === undefined || timecode === null
        ? fallbackMs
        : Math.max(0, (parseTime(timecode) - cueStart) * 1000);

    const ctx = { root, params, anchor, tl, design, layout, durationMs, at };
    mod.build(ctx);
    tl.add(root, { opacity: [1, 0], duration: EXIT, ease: 'inQuad' }, durationMs - EXIT);
    tl.seek(0);
    this.tl = tl;
    this.ctx = ctx;
    return { durationMs };
  },

  seek(ms) {
    this.tl.seek(ms);
  },

  // Boxes of everything that carries text, checked for the caption zone and frame edges.
  layoutIssues() {
    const { design, layout } = this.ctx;
    const captionTop = design.h * (1 - layout.caption_zone);
    const issues = [];
    for (const node of root.querySelectorAll('[data-box]')) {
      const r = node.getBoundingClientRect();
      const name = node.dataset.box;
      if (r.left < 0 || r.top < 0 || r.right > design.w || r.bottom > design.h) {
        issues.push(`${name} extends outside the frame`);
      } else if (r.bottom > captionTop + 1) {
        issues.push(`${name} enters the caption zone`);
      }
    }
    return issues;
  },

  minFontPx() {
    let min = Infinity;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      min = Math.min(min, parseFloat(getComputedStyle(walker.currentNode.parentElement).fontSize));
    }
    return min;
  },
};

window.stageReady = true;
