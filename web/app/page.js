import { redirect } from 'next/navigation';
import { isAuthed } from '../lib/auth';
import { createStore, readState } from '../lib/store';
import Uploader from '../components/Uploader';

export const dynamic = 'force-dynamic';

async function recentJobs() {
  try {
    const store = createStore();
    const files = (await store.list('jobs/')).filter((f) => f.key.endsWith('/job.json'));
    const jobs = await Promise.all(files.slice(-50).map((f) => store.getJson(f.key)));
    const sorted = jobs.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);
    return Promise.all(sorted.map(async (j) => ({ ...j, state: await readState(store, j.id) })));
  } catch {
    return [];
  }
}

export default async function Home() {
  if (!(await isAuthed())) redirect('/login');
  const jobs = await recentJobs();
  return (
    <main className="field">
      <div className="card-wrap">
        <div className="card">
          <div className="brand"><span className="sq" /> Base video edit</div>
          {process.env.BLOB_READ_WRITE_TOKEN || process.env.NODE_ENV !== 'production' ? (
            <Uploader localStore={!process.env.BLOB_READ_WRITE_TOKEN} />
          ) : (
            <p className="err">Storage is not connected: this deployment has no <code>BLOB_READ_WRITE_TOKEN</code>. Connect a public Blob store to the project for the Production environment, then redeploy.</p>
          )}
          {jobs.length ? (
            <div className="recent">
              <h3>Recent</h3>
              {jobs.map((j) => (
                <a key={j.id} href={`/jobs/${j.id}`}>
                  <span>{j.name}</span>
                  <span className="st">{j.state?.status || 'queued'}{j.rounds?.length > 1 ? ` · round ${j.rounds.length}` : ''}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <aside className="tagline">
        <h1>Drop a recording.<br />Get it back edited.</h1>
        <p>Captions, dead air cut, and animations where they help someone learn: term cards, step lists, diagrams, in the Base style.</p>
        <p>About ten minutes. Then you tick what to keep and say anything else in plain words.</p>
        <div className="mono">MP4 · up to 15 minutes · nothing stored longer than you want</div>
      </aside>
    </main>
  );
}
