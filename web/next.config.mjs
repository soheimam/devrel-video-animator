import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  // The app imports the pipeline's lib/ from the repository root.
  outputFileTracingRoot: path.join(here, '..'),
  serverExternalPackages: ['@vercel/sandbox', '@vercel/blob', 'playwright', 'yaml'],
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  agentRules: false,
};
