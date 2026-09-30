// Templates are laid out in "design pixels": the short side of the frame is always 1080,
// so 1920x1080 for landscape and 1080x1920 for vertical video. Renders are scaled to the
// source resolution.
export const DESIGN_SHORT_SIDE = 1080;

export function designSpace(width, height) {
  const scale = Math.min(width, height) / DESIGN_SHORT_SIDE;
  return {
    w: Math.round(width / scale),
    h: Math.round(height / scale),
    scale,
  };
}
