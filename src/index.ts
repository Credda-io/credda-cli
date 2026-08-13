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

/**
 * The did:web identity of the API this CLI talks to, and the issuer every
 * verification expects. `https://api.credda.io` is `did:web:api.credda.io`;
 * point CREDDA_API_URL at staging and the expectation follows it.
 */
const ISSUER_DID = `did:web:${new URL(API_BASE).host.toLowerCase()}`;
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
  // ⚠️ EVERY VERIFIER IS TOLD WHICH ISSUER IT EXPECTS.
  //
  // `credda verify` reads a credential handed over by somebody else, which is
  // the whole point of it. did:web resolution proves the credential was signed
  // by whoever controls the DID's host; it does NOT prove that host is Credda.
  // Without an expected issuer, a credential minted by anyone with a domain
  // verifies clean and the CLI prints it as valid.
  //
  // Stated explicitly rather than left to the SDK default, because this CLI
  // pins an SDK line that does not have that default, and because a call site
  // that says what it expects keeps saying it after the dependency moves.
  // ISSUER_DID follows CREDDA_API_URL, so a CLI pointed at staging expects
  // staging's issuer rather than production's.
  verifiers: {
    trustCredential: (credential) => verifyTrustCredential(credential),
    verifiableCredential: (vcJwt) =>
      verifyVerifiableCredential(vcJwt, { apiBase: API_BASE, issuer: ISSUER_DID }),
    trustExport: (bundle) => verifyTrustExport(bundle, { apiBase: API_BASE, issuer: ISSUER_DID }),
  },
});
