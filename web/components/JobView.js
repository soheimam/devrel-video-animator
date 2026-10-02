'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

const STEPS = [
  ['queued', 'Starting'],
  ['fetching', 'Getting the file'],
  ['transcribing', 'Transcribing'],
  ['suggesting', 'Suggesting'],
  ['rendering', 'Rendering'],
  ['publishing', 'Publishing'],
  ['done', 'Ready'],
];
const ORDER = STEPS.map((s) => s[0]);
const alias = { restoring: 'fetching', applying: 'suggesting' };

export default function JobView({ id }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [unticked, setUnticked] = useState(() => new Set());
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const video = useRef(null);

  useEffect(() => {
    let alive = true;
    let timer;
    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
        if (!r.ok) throw new Error((await r.json()).error || r.statusText);
        const d = await r.json();
        if (!alive) return;
        setData(d);
        setErr('');
        if (!['done', 'failed'].includes(d.state?.status)) timer = setTimeout(tick, 5000);
      } catch (e) {
        if (alive) { setErr(e.message); timer = setTimeout(tick, 8000); }
      }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [id]);

  const state = data?.state;
  const review = state?.review;
  const status = alias[state?.status] || state?.status || 'queued';
  const idx = ORDER.indexOf(status);
  const working = state && !['done', 'failed'].includes(state.status);

  const canSend = useMemo(() => unticked.size > 0 || notes.trim().length > 0, [unticked, notes]);

  async function rerender() {
    setSending(true);
    try {
      const r = await fetch(`/api/jobs/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'rerender', drop: [...unticked], notes }) });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not start.');
      setUnticked(new Set());
      setNotes('');
      setData((d) => ({ ...d, state: { status: 'queued', round: (d?.state?.round || 1) + 1, mode: 'picks' } }));
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this job, its recording and every render?')) return;
    await fetch(`/api/jobs/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'delete' }) });
    location.href = '/';
  }

  const toggle = (bid) => setUnticked((s) => { const n = new Set(s); n.has(bid) ? n.delete(bid) : n.add(bid); return n; });
  const jump = (sec) => { if (video.current) { video.current.currentTime = Math.max(0, sec - 0.5); video.current.play(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

  if (!data && !err) return <div className="status"><span className="pulse" />Loading…</div>;
  if (!data) return <div className="failed">{err}</div>;

  return (
    <>
      <section className="status">
        <h1>{data.job.fileName || data.job.name}</h1>
        <div className="pacing">
          {data.job.rounds.length > 1 ? `Round ${state.round || data.job.rounds.length} · ` : ''}
          {working ? <><span className="pulse" />{state.message || status}</> : state.status === 'done' ? 'Ready to review' : 'Something went wrong'}
        </div>
        {working || state.status === 'done' ? (
          <div className="steps">
            {STEPS.map(([key, label], i) => (
              <span key={key} className={`step${i < idx ? ' done' : ''}${i === idx ? ' on' : ''}`}>{label}</span>
            ))}
          </div>
        ) : null}
        {working ? (
          <p className="hint">
            {status === 'queued' && data.job.launched && data.job.launched.fromSnapshot === false
              ? 'First run on a fresh machine: setting up its tools first, which adds a few minutes this once. Then about ten minutes for a three-minute recording. '
              : 'Usually about ten minutes for a three-minute recording. '}
            You can close this tab; the job keeps going and the page remembers it.
            {' '}<button className="jump" onClick={remove}>Stop and delete this job</button>
          </p>
        ) : null}
        {working && state.log?.length ? (
          <div className="log">{state.log.slice(-8).map((e, i) => <div key={i}>{e.type === 'summary' ? '' : `${e.type}  ${e.detail}`}</div>)}</div>
        ) : null}
        {working && state.machine ? (
          <div className="log">
            machine: {state.machine.status || 'unknown'}{state.machine.error ? ` (${state.machine.error})` : ''}
            {state.machine.bootstrap ? `\n\n# bootstrap.log\n${state.machine.bootstrap.split('\n').slice(-12).join('\n')}` : '\n\nbootstrap has not written anything yet (clone and install in progress)'}
            {state.machine.job ? `\n\n# job.log\n${state.machine.job.split('\n').slice(-8).join('\n')}` : ''}
          </div>
        ) : null}
        {state.status === 'failed' && state.error ? <details className="more"><summary>Details</summary><pre className="log">{state.error}</pre></details> : null}
        {state.status === 'failed' ? (
          <div className="failed">
            <b>Couldn't finish.</b> {state.message}
            {state.commit ? <div className="hint">Pipeline commit {state.commit}</div> : null}
            <div style={{ marginTop: 10 }}><button className="btn secondary" onClick={remove}>Delete this job</button></div>
          </div>
        ) : null}
        {err ? <p className="err">{err}</p> : null}
      </section>

      {review ? (
        <section className="review">
          <video ref={video} className="main" controls preload="metadata" src={review.downloads.video || undefined} />
          <div className="downloads">
            {review.downloads.video ? <a className="btn" href={review.downloads.video} download={`${review.name}-edited.mp4`}>Download edited.mp4</a> : null}
            {review.downloads.srt ? <a className="btn secondary" href={review.downloads.srt} download>captions.srt</a> : null}
            {review.downloads.vtt ? <a className="btn secondary" href={review.downloads.vtt} download>captions.vtt</a> : null}
            <span className="pacing">
              {review.beats.length} animations · {review.cuts.length} cut{review.cuts.length === 1 ? '' : 's'} · {review.pacing.perMinute} per minute · something on screen {review.pacing.coveredShare}% of the time
            </span>
          </div>
          {review.summary ? <div className="summary">{review.summary}</div> : null}

          <div className="howto">
            <b>How to review.</b> Watch the video. Untick anything you'd leave out. Say everything else in plain words at the bottom, the way you'd tell an editor: “the Cobalt card stays up too long”, “the slide should say Sepolia next”, “cut the pause at 1:15”. Then press <b>Re-render with my picks</b>. About ten minutes.
          </div>

          <div className="beats">
            {review.beats.map((b) => (
              <div key={b.id} className={`beat${unticked.has(b.id) ? ' off' : ''}`}>
                <input type="checkbox" checked={!unticked.has(b.id)} onChange={() => toggle(b.id)} aria-label={`Keep ${b.text}`} />
                <div>
                  <div className="head">
                    <span className="n">{String(b.n).padStart(2, '0')} /</span>
                    <button className="jump" onClick={() => jump(b.editedSeconds)}>{b.time}</button>
                    <span className="t">{b.text}</span>
                    <span className="tpl">{b.template}</span>
                  </div>
                  <div className="why">{b.rationale}</div>
                  {b.gif ? <img src={b.gif} alt={b.text} loading="lazy" /> : null}
                  {b.strip ? (
                    <div className="strip">
                      <div className="strip-label">Just landed · last reveal · one second before it leaves</div>
                      <img src={b.strip} alt={`${b.text}: three moments`} loading="lazy" />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {review.cuts.length ? (
            <div className="beats cuts">
              {review.cuts.map((c) => (
                <div key={c.id} className={`beat${unticked.has(c.id) ? ' off' : ''}`}>
                  <input type="checkbox" checked={!unticked.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Keep ${c.id}`} />
                  <div>
                    <div className="head"><span className="n">cut</span><span className="t">{c.from}–{c.to}</span><span className="tpl">{c.seconds}s removed</span></div>
                    <div className="why">{c.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {review.rejected?.length ? (
            <details className="more">
              <summary>Considered and left out ({review.rejected.length})</summary>
              <ul>{review.rejected.map((r, i) => <li key={i}><b>{r.summary}</b> · {r.rule}</li>)}</ul>
            </details>
          ) : null}

          <div className="notesbox">
            <label className="notes">
              Anything else, in plain words
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. the Cobalt card stays up too long · the slide should say Sepolia next · cut the pause at 1:15" />
            </label>
          </div>

          <div className="rerender">
            <span className="pacing">{unticked.size ? `${unticked.size} unticked` : 'Everything kept'}{notes.trim() ? ' · with notes' : ''}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn secondary" onClick={remove}>Delete job</button>
              <button className="btn" disabled={!canSend || sending || working} onClick={rerender}>{sending ? 'Starting…' : 'Re-render with my picks'}</button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
