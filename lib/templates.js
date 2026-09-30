// Registry of edit templates. The browser side lives in templates/<name>.js; this file
// is what the validator and the renderer know about each one.
//
// gaps:      which information gaps (editorial/STANDARD.md) the template may close.
// renderer:  'overlay' is rendered with anime.js in Chromium; 'ffmpeg' transforms the
//            video itself.
// placement: 'anchor' needs cue.anchor {x, y}; 'region' needs params.region; 'panel'
//            accepts an optional anchor (top-left of the panel).
// text:      the words a viewer has to read, used for the reading-time rule.

export const GAPS = [
  'said-not-shown',
  'shown-not-findable',
  'said-once-then-gone',
  'relationship-not-visible',
];

const words = (...parts) => parts.flat().filter(Boolean).join(' ');

export const TEMPLATES = {
  zoom: {
    gaps: ['shown-not-findable'],
    renderer: 'ffmpeg',
    placement: 'region',
    required: ['region'],
    text: () => '',
  },
  'code-focus': {
    gaps: ['shown-not-findable'],
    renderer: 'overlay',
    placement: 'region',
    required: ['region'],
    text: (p) => words(p.label),
  },
  'highlight-region': {
    gaps: ['shown-not-findable'],
    renderer: 'overlay',
    placement: 'region',
    required: ['region'],
    text: (p) => words(p.label),
  },
  callout: {
    gaps: ['shown-not-findable', 'said-not-shown'],
    renderer: 'overlay',
    placement: 'anchor',
    required: ['text'],
    text: (p) => words(p.text),
  },
  'term-definition': {
    gaps: ['said-once-then-gone'],
    renderer: 'overlay',
    placement: 'panel',
    required: ['term', 'gloss'],
    text: (p) => words(p.term, p.gloss),
  },
  'step-list': {
    gaps: ['said-once-then-gone', 'said-not-shown'],
    renderer: 'overlay',
    placement: 'panel',
    required: ['steps'],
    text: (p) => words(p.title, (p.steps || []).map((s) => (typeof s === 'string' ? s : s.text))),
  },
  'flow-diagram': {
    gaps: ['said-not-shown', 'relationship-not-visible'],
    renderer: 'overlay',
    placement: 'panel',
    required: ['nodes'],
    text: (p) => words(p.title, (p.nodes || []).map((n) => (typeof n === 'string' ? n : n.label))),
  },
  comparison: {
    gaps: ['relationship-not-visible'],
    renderer: 'overlay',
    placement: 'panel',
    required: ['left', 'right'],
    text: (p) =>
      words(p.left?.title, p.left?.items, p.right?.title, p.right?.items),
  },
};

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
