export const dynamic = "force-dynamic";

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="card-wrap">
      <div className="card login">
        <div className="brand"><span className="sq" /> Base video edit</div>
        <form method="post" action="/api/login">
          <label className="notes" htmlFor="code">Passcode</label>
          <input id="code" name="code" type="password" inputMode="numeric" autoComplete="one-time-code" autoFocus />
          {!process.env.APP_PASSCODE && process.env.NODE_ENV === 'production' ? (
            <p className="err">This deployment has no passcode set, so nobody can sign in. Add APP_PASSCODE (and AUTH_SECRET) for the {process.env.VERCEL_ENV || 'production'} environment in the Vercel project, then redeploy. Check /api/health to see what this deployment can read.</p>
          ) : sp?.error ? <p className="err">That passcode didn't work.</p> : null}
          <button className="go" type="submit">Enter</button>
        </form>
      </div>
    </main>
  );
}
