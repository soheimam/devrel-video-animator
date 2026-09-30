// Timecodes used across the pipeline. Isomorphic: imported by Node scripts and by the
// browser stage that renders templates.
//
// Accepted forms: 12.5 (seconds), "12.5", "4.2s", "300ms", "02:14.3", "1:02:14.3".

export function parseTime(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid time: ${value}`);
    return value;
  }
  if (typeof value !== 'string') throw new Error(`Invalid time: ${JSON.stringify(value)}`);
  const s = value.trim();
  let m;
  if ((m = /^(\d+(?:\.\d+)?)ms$/.exec(s))) return Number(m[1]) / 1000;
  if ((m = /^(\d+(?:\.\d+)?)s?$/.exec(s))) return Number(m[1]);
  if ((m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(s))) {
    const [, h = '0', min, sec] = m;
    if (Number(sec) >= 60 || (m[1] !== undefined && Number(min) >= 60)) {
      throw new Error(`Invalid time: ${value}`);
    }
    return Number(h) * 3600 + Number(min) * 60 + Number(sec);
  }
  throw new Error(`Invalid time: ${JSON.stringify(value)}`);
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.round(seconds * 10) / 10);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = (total % 60).toFixed(1).padStart(4, '0');
  const mm = String(m).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${s}` : `${mm}:${s}`;
}
