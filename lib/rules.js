// The few numbers the pipeline enforces. Everything else is judgment, and lives in
// editorial/STANDARD.md for the agent and the human.
export const RULES = {
  reading: { seconds_per_word: 0.3, base_seconds: 1.0 },
  cues: { min_duration_seconds: 1.5, max_duration_seconds: 15 },
  zoom: { max_factor: 3.0, padding: 0.15, ramp_seconds: 0.4, min_duration_seconds: 2.0 },
  cuts: { min_seconds: 0.3 },
  layout: {
    caption_zone: 0.15, // bottom fraction of the frame kept clear for captions
    margin: 48, // design px from the frame edge
    min_font_px: 32, // smallest text that still reads on a phone
  },
  theme: { min_contrast: 4.5 },
  captions: {
    burn_by_default: true,
    font: 'Liberation Sans',
    font_px: 52,
    max_chars_per_line: 42,
    max_lines: 2,
    max_seconds: 6,
    min_seconds: 1,
    break_on_pause_seconds: 0.8,
  },
};

export const loadRules = () => RULES;
