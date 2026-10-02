// The web app reads and writes the same store the job runner uses. It bundles its own
// @vercel/blob and hands it to the shared store, since the repo root's dependencies are not
// installed on Vercel.
import * as blob from '@vercel/blob';
import { createStore as baseCreateStore } from '../../lib/store.js';

export { readState, writeState, newJobId, contentTypeFor } from '../../lib/store.js';
export const createStore = (env = process.env) => baseCreateStore(env, { blob: async () => blob });
