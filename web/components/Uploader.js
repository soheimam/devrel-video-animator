'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const nice = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(0)} MB` : `${Math.round(n / 1e3)} KB`);

export default function Uploader({ localStore }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState('');
  const input = useRef(null);
  const router = useRouter();

  const pick = (f) => {
    if (!f) return;
    if (!/\.(mp4|mov|m4v)$/i.test(f.name)) return setError('Please drop an MP4 (or MOV).');
    setError('');
    setFile(f);
  };

  async function start() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      let sourceUrl;
      if (localStore) {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/upload-local', { method: 'POST', body: fd });
        if (!r.ok) throw new Error(await r.text());
        sourceUrl = (await r.json()).url;
        setPct(100);
      } else {
        const { upload } = await import('@vercel/blob/client');
        // If nothing moves for a while, say so instead of sitting at 0%: on a VPN the direct
        // upload to Blob storage can be blocked while the rest of the site works.
        let lastMove = Date.now();
        const watchdog = setInterval(() => {
          if (Date.now() - lastMove > 45000) {
            setError('The upload is not moving. If you are on a VPN, uploads to Vercel Blob (blob.vercel-storage.com) may be blocked; try off the VPN or from another network.');
          }
        }, 5000);
        try {
          const blob = await upload(`uploads/${Date.now()}-${file.name}`, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
            multipart: true,
            onUploadProgress: (p) => { lastMove = Date.now(); setError(''); setPct(Math.round(p.percentage)); },
          });
          sourceUrl = blob.url;
        } finally {
          clearInterval(watchdog);
        }
      }
      const r = await fetch('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fileName: file.name, sourceUrl, notes, size: file.size }) });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not start the job.');
      const { id } = await r.json();
      router.push(`/jobs/${id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        className={`drop${over ? ' over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
      >
        <div className="plus">+</div>
        <h2>{file ? 'Swap the file' : 'Drop your recording'}</h2>
        <p>or click to choose · MP4, up to 15 minutes</p>
        <input ref={input} type="file" accept="video/mp4,video/quicktime,.mp4,.mov,.m4v" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {file ? (
        <div className="file">
          <span><b>{file.name}</b> · {nice(file.size)}</span>
          {!busy ? <button className="x" aria-label="Remove" onClick={() => setFile(null)}>×</button> : null}
        </div>
      ) : null}
      <label className="notes">
        Anything the editor should know? (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who it's for, what must stay intact, anything to avoid. Example: for app developers; keep the demo at 1:20 as is." />
      </label>
      {busy ? <div className="progress"><i style={{ width: `${pct}%` }} /></div> : null}
      {error ? <p className="err">{error}</p> : null}
      <button className="go" disabled={!file || busy} onClick={start}>
        {busy ? (pct < 100 ? `Uploading ${pct}%` : 'Starting…') : 'Edit this video'}
      </button>
      <p className="hint">You'll get the edited MP4 with captions, plus a GIF of each animation so you can keep or drop them. The recording and the renders stay in this app's storage until you delete the job.</p>
    </div>
  );
}
