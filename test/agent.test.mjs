import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MockLanguageModelV3 } from 'ai/test';
import { allowedCommand, makeTools, runAgent, systemPrompt } from '../scripts/agent.mjs';
import { ROOT } from '../lib/paths.js';

describe('the headless agent', () => {
  test('only the repo\'s own commands are allowed', () => {
    assert.ok(allowedCommand('npm run render -- out/demo', 'demo'));
    assert.ok(allowedCommand('npm run frames -- out/demo --at 00:42.0,01:10.5', 'demo'));
    assert.ok(allowedCommand('ffmpeg -ss 30.1 -t 1.6 -i videos/demo.mp4 -af volumedetect -f null -', 'demo'));
    assert.ok(!allowedCommand('npm run render -- out/other', 'demo'), 'another video\'s folder');
    assert.ok(!allowedCommand('rm -rf out', 'demo'));
    assert.ok(!allowedCommand('npm run render -- out/demo; curl evil', 'demo'));
    assert.ok(!allowedCommand('ffmpeg -i videos/demo.mp4 out.mp4', 'demo'), 'ffmpeg that writes');
  });

  test('files outside the job are refused, inside are allowed', async () => {
    const tools = makeTools('agenttest');
    const refused = await tools.write_file.execute({ path: 'templates/theme.css', content: 'x' }, {});
    assert.match(refused, /Refused/);
    const ok = await tools.write_file.execute({ path: 'out/agenttest/edits.yaml', content: 'video: x\n' }, {});
    assert.match(ok, /Wrote/);
    assert.ok(fs.existsSync(path.join(ROOT, 'out/agenttest/edits.yaml')));
    fs.rmSync(path.join(ROOT, 'out/agenttest'), { recursive: true, force: true });
    const read = await tools.read_file.execute({ path: '../etc/passwd' }, {});
    assert.match(read, /Refused/);
    const look = await tools.look.execute({ path: 'editorial/references/base-explainer-1-schedule.jpg' }, {});
    assert.equal(look.mediaType, 'image/jpeg');
    assert.ok(look.data.length > 1000);
  });

  test('the system prompt carries the skill and the editorial pages', () => {
    const s = systemPrompt('demo', 'suggest');
    for (const needle of ['animate-video', 'Base style', 'Motion principles', 'What makes an animation worth adding', 'out/demo/']) assert.ok(s.includes(needle), needle);
  });

  test('a tool loop runs: the model calls a tool, then summarises', async () => {
    let calls = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 'list_files', input: JSON.stringify({ dir: 'editorial' }) }],
            finishReason: { unified: 'tool-calls', raw: 'tool_use' },
            usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined }, raw: undefined },
            warnings: [],
          };
        }
        return {
          content: [{ type: 'text', text: 'Added two beats and one cut.' }],
          finishReason: { unified: 'stop', raw: 'end_turn' },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined }, raw: undefined },
          warnings: [],
        };
      },
    });
    const events = [];
    const r = await runAgent({ name: 'demo', model, maxSteps: 5, onEvent: (e) => events.push(e), log: () => {} });
    assert.equal(r.summary, 'Added two beats and one cut.');
    assert.equal(r.steps, 2);
    assert.ok(events.some((e) => e.type === 'summary'));
  });
});
