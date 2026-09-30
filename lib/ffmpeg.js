import { spawn } from 'node:child_process';

export const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

export function run(cmd, args, { input, quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => {
      stderr += d;
      if (!quiet) process.stderr.write(d);
    });
    child.on('error', (err) => reject(new Error(`Could not run ${cmd}: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with ${code}\n${stderr.slice(-4000)}`));
    });
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

export async function hasCommand(cmd) {
  try {
    await run(cmd, ['-version']);
    return true;
  } catch {
    return false;
  }
}

// Width, height, frame rate, duration and whether there is an audio track.
export async function probe(file) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,width,height,avg_frame_rate,r_frame_rate:format=duration',
    '-of', 'json',
    file,
  ]);
  const info = JSON.parse(stdout);
  const video = info.streams.find((s) => s.codec_type === 'video');
  if (!video) throw new Error(`No video stream in ${file}`);
  const rate = (r) => {
    const [n, d] = String(r || '0/1').split('/').map(Number);
    return d ? n / d : 0;
  };
  // Screen recordings are often variable frame rate; the pipeline renders at a constant
  // rate, rounded to a sane value.
  const fps = Math.round(rate(video.avg_frame_rate) || rate(video.r_frame_rate) || 30) || 30;
  return {
    path: file,
    width: video.width,
    height: video.height,
    fps: Math.min(Math.max(fps, 1), 60),
    duration: Number(info.format.duration),
    hasAudio: info.streams.some((s) => s.codec_type === 'audio'),
  };
}
