'use client';
import { useEffect, useState } from 'react';

// The prepared machine: a snapshot with ffmpeg, Chromium and the dependencies already installed,
// so a job starts in seconds. Shown on the front door so nobody wonders why a job is slow.
export default function Machine() {
  const [m, setM] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    let timer;
    const tick = async () => {
      try {
        const r = await fetch('/api/machine', { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;
        setM(d);
        if (d.pending) timer = setTimeout(tick, 6000);
      } catch (e) {
        if (alive) setErr(e.message);
      }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  async function act(action) {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/machine', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      const s = await (await fetch('/api/machine', { cache: 'no-store' })).json();
      setM(s);
      if (s.pending) setTimeout(() => location.reload(), 1500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!m || m.local) return null;
  const when = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="recent">
      <h3>Machine</h3>
      {m.pending ? (
        <div className="hint">
          <span className="pulse" />Preparing a machine (installing ffmpeg, Chromium and dependencies, a one-time few minutes). Status: {m.pending.machine || 'starting'}.
          {m.pending.log ? <pre className="log">{m.pending.log.split('\n').slice(-6).join('\n')}</pre> : null}
        </div>
      ) : m.snapshot ? (
        <div className="hint">
          Prepared {when(m.snapshot.createdAt)}. Jobs start in seconds.{' '}
          <button className="jump" disabled={busy} onClick={() => act('prepare')}>Prepare again</button>
          {' · '}
          <button className="jump" disabled={busy} onClick={() => act('forget')}>Forget</button>
        </div>
      ) : (
        <div className="hint">
          Not prepared: each job first installs its tools (several extra minutes).{' '}
          <button className="jump" disabled={busy} onClick={() => act('prepare')}>{busy ? 'Starting…' : 'Prepare the machine now'}</button>
        </div>
      )}
      {m.error ? <div className="err">{m.error}{m.log ? <pre className="log">{m.log.split('\n').slice(-10).join('\n')}</pre> : null}</div> : null}
      {err ? <div className="err">{err}</div> : null}
    </div>
  );
}
