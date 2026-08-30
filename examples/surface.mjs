/*
 * A runnable example, and one that fails when it is wrong.
 *
 * The README shows an import line. An import line is not an example: it does
 * not run, so nothing notices when the surface it describes moves. This does
 * run, it asserts, and `npm run example` is wired into CI after the build --
 * so a mirror that no longer exports what the README says it exports goes red
 * here rather than on a stranger's machine.
 *
 * It uses `node:assert/strict`, whose failures throw and exit non-zero. There
 * is deliberately no try/catch and no "if (!ok) console.warn": an example that
 * reports a broken surface on stdout and exits 0 is the defect it exists to
 * prevent.
 *
 * Run it against the built package:   npm run build && npm run example
 */
import assert from 'node:assert/strict';

import {
  COMMANDS,
  EXIT,
  EXECUTABLE_PACKAGE,
  canonicalCommand,
  commandUsage,
  numberFlag,
  parseArgs,
  rootUsage,
  UsageError,
} from '../dist/index.js';

/* 1. What can this CLI be asked to do? Read off the mirrored table, offline. */
const verbs = Object.keys(COMMANDS).filter((name) => canonicalCommand(name) === name);
console.log(`credda offers ${String(verbs.length)} commands: ${verbs.join(', ')}`);
assert.ok(verbs.includes('investigate'), 'investigate is the verb this product is about');
assert.ok(verbs.includes('discover'), 'discover is on the table');

/* 2. Aliases are aliases, not separate commands. An old script name must resolve. */
assert.equal(canonicalCommand('fix'), 'investigate');
assert.equal(canonicalCommand('resolution'), 'report');
console.log("'fix' resolves to 'investigate'; 'resolution' resolves to 'report'");

/* 3. Parse a command line the way `credda` would, without running anything. */
const parsed = parseArgs(
  ['investigate', './my-app', '@./issue.md', '--budget-minutes', '5', '--json'],
  COMMANDS,
);
assert.equal(parsed.command, 'investigate');
assert.deepEqual(parsed.positionals, ['./my-app', '@./issue.md']);
assert.equal(numberFlag(parsed, 'budget-minutes'), 5);
assert.equal(parsed.globals.json, true);
console.log('parsed: investigate ./my-app @./issue.md --budget-minutes 5 --json');

/* 4. A bad command line is refused here, before a run is ever started. */
assert.throws(
  () => parseArgs(['investigate', './my-app', 'x', '--sandbox', 'nonesuch'], COMMANDS),
  UsageError,
  '--sandbox must reject a value outside its choices',
);
console.log('rejected: --sandbox nonesuch');

/* 5. The exit-code contract a calling script has to branch on. */
assert.equal(EXIT.SUCCESS, 0);
assert.equal(EXIT.NO_RUNNABLE_CHECK, 5, 'kept apart from 0 so `credda … && deploy` cannot misread it');
assert.equal(EXIT.COMMENT_READY, 6, 'triage speaks on 6 and is silent on 0, that way round');
assert.equal(EXIT.CANCELLATION_REQUESTED, 7, 'a run asked to stop has not stopped');
console.log('exit codes: 0 success, 5 no runnable check, 6 triage comment, 7 cancellation requested');

/* 6. Credda proposes and never merges, and no flag on this surface changes that. */
const everyFlag = Object.values(COMMANDS).flatMap((command) => Object.keys(command.flags));
for (const forbidden of ['merge', 'apply', 'push', 'commit']) {
  assert.ok(!everyFlag.includes(forbidden), `no command may carry --${forbidden}`);
}
console.log('no command carries --merge, --apply, --push or --commit');

/* 7. The help text is generated from the same table, so it cannot drift from it. */
assert.ok(rootUsage().includes('investigate'));
assert.ok(commandUsage('discover').includes('Starts nothing'));
console.log(`help is generated from this table; the CLI itself installs from '${EXECUTABLE_PACKAGE}'`);

console.log('\nOK — every assertion above passed.');
