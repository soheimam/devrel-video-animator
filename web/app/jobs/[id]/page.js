import { redirect } from 'next/navigation';
import { isAuthed } from '../../../lib/auth';
import JobView from '../../../components/JobView';

export const dynamic = 'force-dynamic';

export default async function JobPage({ params }) {
  if (!(await isAuthed())) redirect('/login');
  const { id } = await params;
  return (
    <main className="page">
      <div className="topbar">
        <a href="/"><span className="sq" /> Base video edit</a>
        <a href="/" style={{ fontWeight: 400, fontSize: 14 }}>+ New video</a>
      </div>
      <div className="wrap">
        <JobView id={id} />
      </div>
    </main>
  );
}
