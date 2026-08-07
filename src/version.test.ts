/**
 * Drift guard for what `credda --version` prints.
 *
 * `VERSION` in `cli.ts` is a literal, and it has to stay one: that module is
 * the pure command router with no `process`, no `fs` and no env access, which
 * is what lets the whole command surface be unit-tested against a mocked
 * client. Reading `package.json` there would put `node:fs` in the router's
 * module graph and give up that property for a single string.
 *
 * So the literal stays and this test makes it impossible for it to go stale.
 * The sibling `@credda/mcp-server` shipped a hardcoded `0.0.1` in its
 * `serverInfo` for the whole published life of the package while
 * `package.json` said `0.1.3`, because nothing compared the two. This is that
 * comparison.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VERSION } from './cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));

describe('credda --version', () => {
  it('prints the version this package actually publishes', () => {
    expect(VERSION).toBe(pkg.version);
  });
});
