#!/usr/bin/env node
/**
 * `credda`: entry point. All logic lives in cli.ts (testable); this file only
 * wires the real environment: env vars, stdin/file reading, process exit.
 */

import { readFile, writeFile } from 'node:fs/promises';
import {
  CreddaClient,
  verifyTrustCredential,
  verifyVerifiableCredential,
  verifyTrustExport,
} from '@credda/js/headless';
import { runCli } from './cli.js';
import { startListener } from './listener.js';

async function readInput(pathOrDash: string): Promise<string> {
  if (pathOrDash === '-') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  }
  return readFile(pathOrDash, 'utf8');
}

// Raw authenticated GET for the CSV endpoints (?format=csv): the typed SDK
// returns parsed JSON only and documents CSV as a raw-fetch use case. Built
// from the same base URL the client is configured with.
const API_BASE = (process.env.CREDDA_API_URL ?? 'https://api.credda.io').replace(/\/+$/, '');
async function fetchCsv(path: string, apiKey: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      detail = body.error ?? body.message ?? '';
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail || `request failed (${res.status})`);
  }
  return res.text();
}

// process.exitCode (not process.exit()): a hard exit right after a fetch
// trips a libuv assertion on Windows Node while handles are still closing.
process.exitCode = await runCli(process.argv.slice(2), {
  client: new CreddaClient({ apiBase: process.env.CREDDA_API_URL }),
  fetchCsv,
  writeFile: (path, content) => writeFile(path, content, 'utf8'),
  apiKey: process.env.CREDDA_API_KEY,
  webhookSecret: process.env.CREDDA_WEBHOOK_SECRET,
  startListener,
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  readInput,
  verifiers: {
    trustCredential: (credential) => verifyTrustCredential(credential),
    verifiableCredential: (vcJwt) => verifyVerifiableCredential(vcJwt),
    trustExport: (bundle) => verifyTrustExport(bundle),
  },
});
