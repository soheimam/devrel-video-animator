// Which settings this deployment can see: names and yes/no only, never values.
export const dynamic = 'force-dynamic';

export function GET() {
  const has = (k) => Boolean(process.env[k] && String(process.env[k]).trim());
  return Response.json({
    deployment: process.env.VERCEL_URL || 'local',
    environment: process.env.VERCEL_ENV || 'development',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
    settings: {
      APP_PASSCODE: has('APP_PASSCODE'),
      AUTH_SECRET: has('AUTH_SECRET'),
      AI_GATEWAY_API_KEY: has('AI_GATEWAY_API_KEY'),
      BLOB_READ_WRITE_TOKEN: has('BLOB_READ_WRITE_TOKEN'),
    },
  });
}
