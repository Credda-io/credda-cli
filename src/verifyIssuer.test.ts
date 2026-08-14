/**
 * `credda verify` reads a credential somebody else handed over. That is the
 * whole command, and it is why the issuer must be stated.
 *
 * did:web resolution proves a credential was signed by whoever controls the
 * DID's host. It does not prove that host is Credda, so a credential minted by
 * anyone with a domain verifies clean unless an expected issuer is supplied.
 * This CLI pins an @credda/js line whose default does not supply one, so the
 * expectation is stated here, at the call site, where it keeps holding after the
 * dependency moves.
 *
 * The composition root runs on import, so this reads it as source rather than
 * executing it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf8');

describe('the CLI tells every verifier which issuer it expects', () => {
  it('derives the issuer DID from the API base rather than hardcoding production', () => {
    expect(src).toMatch(/const ISSUER_DID = `did:web:\$\{new URL\(API_BASE\)\.host\.toLowerCase\(\)\}`/);
  });

  it('passes it to the W3C credential verifier', () => {
    expect(src).toMatch(/verifyVerifiableCredential\(vcJwt,\s*\{[^}]*issuer: ISSUER_DID/s);
  });

  it('passes it to the trust-export verifier, which verifies an embedded credential', () => {
    expect(src).toMatch(/verifyTrustExport\(bundle,\s*\{[^}]*issuer: ISSUER_DID/s);
  });

  it('never calls a credential verifier with no options at all', () => {
    expect(src).not.toMatch(/verifyVerifiableCredential\(vcJwt\)/);
    expect(src).not.toMatch(/verifyTrustExport\(bundle\)/);
  });
});
