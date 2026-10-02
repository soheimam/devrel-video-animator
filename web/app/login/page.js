export default async function Login({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="card-wrap">
      <div className="card login">
        <div className="brand"><span className="sq" /> Base video edit</div>
        <form method="post" action="/api/login">
          <label className="notes" htmlFor="code">Passcode</label>
          <input id="code" name="code" type="password" inputMode="numeric" autoComplete="one-time-code" autoFocus />
          {sp?.error ? <p className="err">That passcode didn't work.</p> : null}
          <button className="go" type="submit">Enter</button>
        </form>
      </div>
    </main>
  );
}
