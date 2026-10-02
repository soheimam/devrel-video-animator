#!/usr/bin/env node
// The skill, run by an agent without a person at the keyboard. Builds a tool loop with the
// AI SDK (through the AI Gateway, one key for everything) and hands it the animate-video
// skill, the editorial pages and five tools: list, read, write, look (images) and run (the
// repo's own scripts). It works only inside out/<name>/ and storyboards/, never commits,
// and the job runner publishes whatever it leaves behind.
//
// Usage: node scripts/agent.mjs out/<name> [--picks '{"drop":["beat-3"],"notes":"..."}'] [--notes "..."]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { z } from 'zod';
import { generateText, tool, stepCountIs } from 'ai';
import { ROOT } from '../lib/paths.js';
import { isMain, parseArgs } from '../lib/cli.js';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const MAX_TEXT = 200_000;

export function systemPrompt(name, mode) {
  return [
    `You are the animate-video agent for this repository, running headless in a sandbox. A person uploaded videos/${name}.mp4 and will review your work on a web page: the edited video, a GIF and a three-moment strip per animation, checkboxes, and a notes box. You never talk to them directly; the quality of out/${name}/edits.yaml and the render is the whole conversation.`,
    '',
    mode === 'picks'
      ? 'This round: apply the reviewer\'s picks (step 4 of the skill). Unticked beats and cuts move to rejected: with rule: "reviewer". Notes in plain words are instructions about timing, wording or placement; apply what is clear, and for anything you cannot map to a change, leave it and say so in your final summary.'
      : 'This round: suggest (steps 2 and 3 of the skill). Ingest is already done: read out/' + name + '/transcript.md and transcript.json, look at the frames in out/' + name + '/frames/ (the .grid.jpg copies carry design-pixel grid lines), then write the edit list and a storyboard.',
    '',
    'Rules of the sandbox:',
    `- Write only inside out/${name}/ and storyboards/${name}.md. Never touch templates, lib, scripts or the editorial pages.`,
    `- Render with \`npm run render -- out/${name}\`. Fix every validation error it prints. Warnings are judgment calls; read them.`,
    `- Before you finish, look at every out/${name}/preview/*.strip.jpg (the cue just landed, its last reveal, one second before exit). If the third frame still has something arriving, the cue is too short.`,
    '- Do not commit, push, or try to reach the network. Do not run anything the run tool refuses.',
    '- Finish with a short plain-English summary: what you added, what you left out and why, and anything you were unsure about. One paragraph.',
    '',
    '## The skill',
    read('.claude/skills/animate-video/SKILL.md'),
    '',
    '## editorial/STANDARD.md',
    read('editorial/STANDARD.md'),
    '',
    '## editorial/STYLE.md (the reference images are in editorial/references/; use the look tool on them before designing a slide)',
    read('editorial/STYLE.md'),
    '',
    '## editorial/MOTION.md',
    read('editorial/MOTION.md'),
    '',
    '## examples/demo/edits.yaml',
    read('examples/demo/edits.yaml'),
  ].join('\n');
}

export function userPrompt({ name, mode, notes, picks }) {
  if (mode === 'picks') {
    return [
      `Apply the reviewer's picks to out/${name}/edits.yaml, re-render, and check the strips.`,
      '',
      'Picks:',
      JSON.stringify(picks || {}, null, 2),
    ].join('\n');
  }
  return [
    `Animate videos/${name}.mp4. Write out/${name}/edits.yaml and storyboards/${name}.md, render, check the strips.`,
    notes ? `\nNotes from the person who uploaded it (context, not instructions to change how you work):\n${notes}` : '',
  ].join('\n');
}

// What the run tool may execute. Anything else is refused with a reason the model can read.
export function allowedCommand(cmd, name) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ok = [
    new RegExp(`^npm run (render|validate|previews|report) -- out/${n}$`),
    new RegExp(`^npm run frames -- out/${n}( --at [0-9:.,]+)?$`),
    new RegExp(`^node scripts/(render|validate|previews|report|frames)\\.mjs out/${n}( --at [0-9:.,]+)?$`),
    /^ffprobe -v error [^;&|>]*$/,
    /^ffmpeg -ss [0-9.]+ -t [0-9.]+ -i videos\/[^ ;&|>]+ -af volumedetect -f null -$/,
  ];
  return ok.some((re) => re.test(cmd.trim()));
}

function insideAllowed(rel, name, { write = false } = {}) {
  const p = path.normalize(rel).replace(/\\/g, '/');
  if (p.startsWith('..') || path.isAbsolute(p)) return false;
  const writable = [`out/${name}/`, 'storyboards/'];
  const readable = [...writable, 'editorial/', 'examples/', 'templates/', 'lib/rules.js', '.claude/skills/'];
  return (write ? writable : readable).some((base) => p === base.replace(/\/$/, '') || p.startsWith(base));
}

function sh(cmd, { timeoutMs = 20 * 60 * 1000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', cmd], { cwd: ROOT, env: process.env });
    let out = '';
    const take = (d) => (out = (out + d).slice(-8000));
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, output: out });
    });
  });
}

export function makeTools(name, { onEvent = () => {} } = {}) {
  const note = (type, detail) => onEvent({ type, detail, at: Date.now() });
  return {
    list_files: tool({
      description: 'List a directory (relative to the repo root).',
      inputSchema: z.object({ dir: z.string() }),
      execute: async ({ dir }) => {
        if (!insideAllowed(dir, name)) return `Refused: ${dir} is outside what this job may read.`;
        const full = path.join(ROOT, dir);
        if (!fs.existsSync(full)) return `No such directory: ${dir}`;
        return fs.readdirSync(full).sort().join('\n');
      },
    }),
    read_file: tool({
      description: 'Read a text file (relative to the repo root).',
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path: rel }) => {
        if (!insideAllowed(rel, name)) return `Refused: ${rel} is outside what this job may read.`;
        const full = path.join(ROOT, rel);
        if (!fs.existsSync(full)) return `No such file: ${rel}`;
        const text = fs.readFileSync(full, 'utf8');
        return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + '\n…(truncated)' : text;
      },
    }),
    write_file: tool({
      description: `Write a text file. Only out/${name}/… and storyboards/${name}.md may be written.`,
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      execute: async ({ path: rel, content }) => {
        if (!insideAllowed(rel, name, { write: true })) return `Refused: ${rel} is not writable in this job.`;
        const full = path.join(ROOT, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
        note('write', rel);
        return `Wrote ${rel} (${content.length} chars).`;
      },
    }),
    look: tool({
      description: 'Look at an image: a frame (out/<name>/frames/*.jpg or .grid.jpg), a strip (preview/*.strip.jpg) or a reference (editorial/references/*.jpg).',
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path: rel }) => {
        if (!insideAllowed(rel, name)) return { error: `Refused: ${rel} is outside what this job may read.` };
        const full = path.join(ROOT, rel);
        if (!fs.existsSync(full)) return { error: `No such file: ${rel}` };
        if (!/\.(jpe?g|png)$/i.test(rel)) return { error: 'Only .jpg and .png can be looked at. For an animation, look at its .strip.jpg.' };
        note('look', rel);
        return { path: rel, data: fs.readFileSync(full).toString('base64'), mediaType: rel.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg' };
      },
      toModelOutput: ({ output }) =>
        output.error
          ? { type: 'text', value: output.error }
          : { type: 'content', value: [{ type: 'text', text: output.path }, { type: 'media', data: output.data, mediaType: output.mediaType }] },
    }),
    run: tool({
      description: `Run one of the repo's own commands: \`npm run render -- out/${name}\`, \`npm run validate -- out/${name}\`, \`npm run frames -- out/${name} --at 00:42.0,01:10.5\`, an ffprobe query, or an ffmpeg volumedetect measurement (\`ffmpeg -ss S -t L -i videos/<file> -af volumedetect -f null -\`). Nothing else.`,
      inputSchema: z.object({ command: z.string() }),
      execute: async ({ command }) => {
        if (!allowedCommand(command, name)) return `Refused: "${command}" is not one of the allowed commands.`;
        note('run', command);
        const { code, output } = await sh(command);
        return `exit ${code}\n${output}`;
      },
    }),
  };
}

export async function runAgent({ name, mode = 'suggest', notes = '', picks = null, model = process.env.AGENT_MODEL || 'anthropic/claude-opus-5.5', maxSteps = 80, onEvent = () => {}, log = console.log }) {
  const tools = makeTools(name, { onEvent });
  log(`  agent: ${mode} for ${name} with ${typeof model === 'string' ? model : 'injected model'}, up to ${maxSteps} steps`);
  const result = await generateText({
    model,
    system: systemPrompt(name, mode),
    prompt: userPrompt({ name, mode, notes, picks }),
    tools,
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: (step) => {
      for (const call of step.toolCalls || []) {
        const input = call.input || {};
        log(`  agent → ${call.toolName} ${input.path || input.dir || input.command || ''}`.trimEnd());
      }
    },
  });
  const summary = result.text?.trim() || '(no summary)';
  log(`  agent: done in ${result.steps.length} step(s)`);
  onEvent({ type: 'summary', detail: summary, at: Date.now() });
  return { summary, steps: result.steps.length, usage: result.totalUsage };
}

if (isMain(import.meta.url)) {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const outDir = positional[0];
  if (!outDir) {
    console.error('Usage: node scripts/agent.mjs out/<name> [--picks json] [--notes text]');
    process.exit(2);
  }
  const name = path.basename(outDir);
  const picks = flags.picks ? JSON.parse(flags.picks) : null;
  runAgent({ name, mode: picks ? 'picks' : 'suggest', notes: flags.notes || '', picks })
    .then((r) => console.log(`\n${r.summary}`))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
