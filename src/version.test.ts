/**
 * Drift guards on the manifest.
 *
 * Through 0.1.6 this file compared a hardcoded `VERSION` in `cli.ts` against
 * `package.json`, because that CLI printed a version string. This package
 * prints nothing and installs nothing, so that comparison has no subject. The
 * guards that replace it are the two claims 1.0.0 makes to the registry, and
 * both are the kind that rot quietly: that the `credda` executable name has
 * been given up, and that the break is on a major version.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EXECUTABLE_PACKAGE, MIRRORED_FILES } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

describe('the published manifest', () => {
  it('claims no executable, so it cannot collide with the credda CLI', () => {
    // The whole point of 1.0.0. `credda` (unscoped) owns the `credda` bin.
    expect(pkg.bin).toBeUndefined();
    expect(EXECUTABLE_PACKAGE).toBe('credda');
  });

  it('puts the meaning change on a major version, not a patch release', () => {
    const major = Number(String(pkg.version).split('.')[0]);
    expect(Number.isInteger(major)).toBe(true);
    expect(major).toBeGreaterThanOrEqual(1);
  });

  it('describes itself as a mirror rather than as the trust client it used to be', () => {
    expect(pkg.description).toMatch(/mirror/i);
    expect(pkg.description).not.toMatch(/trust|reliability|credential/i);
  });

  it('ships the mirrored surface files it says it ships', () => {
    for (const file of MIRRORED_FILES) {
      expect(() => readFileSync(join(here, file), 'utf8')).not.toThrow();
    }
  });
});

describe('the README', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');

  it('warns that the package changed meaning', () => {
    expect(readme).toMatch(/0\.1\.6/);
  });

  it('states the Fixer gate as a dated status, never as a principle', () => {
    expect(readme).not.toMatch(/does not write code, and that is a decision/i);
    expect(readme).toMatch(/2026-08-2\d/);
  });

  it('points at the achromatic lockups', () => {
    expect(readme).toContain('credda-lockup-black.png');
    expect(readme).toContain('credda-lockup-white.png');
    expect(readme).not.toContain('creddaseallockup');
  });
});
