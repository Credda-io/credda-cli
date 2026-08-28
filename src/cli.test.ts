/**
 * The command-surface tests.
 *
 * These replace the trust-CLI tests that stood here through 0.1.6. That CLI's
 * commands (score, verify, confirmations, listen, …) are gone from the product,
 * so tests asserting their behaviour were not fixable and were not kept. What
 * replaces them tests the thing this package now is: a faithful, offline copy
 * of the `credda` command surface. Every expectation below is read off
 * `commands.ts`, which is itself a byte-for-byte copy of the engine's.
 */

import { describe, it, expect } from 'vitest';
import { COMMANDS, EXIT, RESERVED_EXIT_CODES, canonicalCommand, commandUsage, rootUsage } from './commands.js';
import { UsageError, parseArgs, stringFlag, numberFlag, boolFlag } from './args.js';

const parse = (argv: string[]) => parseArgs(argv, COMMANDS);

describe('the mirrored command table', () => {
  it('offers the commands the engine CLI offers, and no others', () => {
    expect(Object.keys(COMMANDS).sort()).toEqual(
      [
        'doctor',
        'events',
        'fix',
        'init',
        'inspect',
        'investigate',
        'reap',
        'report',
        'resolution',
        'resolve',
        'status',
        'triage',
      ].sort(),
    );
  });

  it('keeps the former names working as aliases rather than as separate commands', () => {
    expect(canonicalCommand('fix')).toBe('investigate');
    expect(canonicalCommand('resolve')).toBe('investigate');
    expect(canonicalCommand('resolution')).toBe('report');
    // An unknown name is returned unchanged, so the caller owns that error.
    expect(canonicalCommand('nonesuch')).toBe('nonesuch');
  });

  it("does not offer a flag that turns on patch writing, because the engine's table has none", () => {
    const flags = Object.values(COMMANDS).flatMap((command) => Object.keys(command.flags));
    for (const forbidden of ['fix', 'patch', 'apply', 'write', 'pr', 'pull-request']) {
      expect(flags).not.toContain(forbidden);
    }
  });
});

describe('parsing', () => {
  it('reads the investigate positionals and flags', () => {
    const parsed = parse(['investigate', './repo', 'the checkout 500s', '--budget-minutes', '5']);
    expect(parsed.command).toBe('investigate');
    expect(parsed.positionals).toEqual(['./repo', 'the checkout 500s']);
    expect(numberFlag(parsed, 'budget-minutes')).toBe(5);
  });

  it('accepts --flag=value and short aliases', () => {
    const parsed = parse(['events', 'abc123', '-f', '--since=12']);
    expect(boolFlag(parsed, 'follow')).toBe(true);
    expect(numberFlag(parsed, 'since')).toBe(12);
  });

  it('treats a bare - as a positional, since it means stdin to investigate', () => {
    expect(parse(['investigate', './repo', '-']).positionals).toEqual(['./repo', '-']);
  });

  it('stops flag parsing at --', () => {
    expect(parse(['triage', '--', '--repo']).positionals).toEqual(['--repo']);
  });

  it('rejects a value outside a flag\'s choices', () => {
    expect(() => parse(['investigate', './r', 'x', '--sandbox', 'vm'])).toThrow(UsageError);
    expect(stringFlag(parse(['investigate', './r', 'x', '--sandbox', 'docker']), 'sandbox')).toBe('docker');
  });

  it('rejects an unknown command rather than taking it as a positional', () => {
    expect(() => parse(['investgate', './r'])).toThrow(/Unknown command/);
  });

  it('suggests the near miss on an unknown flag', () => {
    expect(() => parse(['status', '--limt', '3'])).toThrow(/--limit/);
  });

  it('reports a missing value instead of swallowing the next flag', () => {
    expect(() => parse(['status', '--limit', '--json'])).toThrow(/needs a value/);
  });

  it('reads a negative number as a value, not as a flag', () => {
    expect(numberFlag(parse(['events', 'a', '--since', '-2']), 'since')).toBe(-2);
  });

  it('collects the global flags', () => {
    const parsed = parse(['status', '--json', '--quiet', '--no-color']);
    expect(parsed.globals.json).toBe(true);
    expect(parsed.globals.quiet).toBe(true);
    expect(parsed.globals.color).toBe(false);
  });
});

describe('exit codes', () => {
  it('holds 3 open rather than reusing it', () => {
    expect(RESERVED_EXIT_CODES[EXIT.PATCH_REJECTED]).toMatch(/writes no changes in this version/);
  });

  it('gives triage a speaking code distinct from NO_RUNNABLE_CHECK', () => {
    expect(EXIT.COMMENT_READY).toBe(6);
    expect(EXIT.COMMENT_READY).not.toBe(EXIT.NO_RUNNABLE_CHECK);
    expect(EXIT.SUCCESS).toBe(0);
  });
});

describe('rendered help', () => {
  it('lists every non-alias command and every alias', () => {
    const usage = rootUsage();
    for (const name of Object.keys(COMMANDS)) expect(usage).toContain(name);
  });

  it('makes an alias state what it does, so an old name is not read as a promise', () => {
    expect(commandUsage('fix')).toContain('What it does: reproduce a reported failure');
  });
});
