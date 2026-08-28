/**
 * `@credda/cli`: the public source mirror for the Credda CLI.
 *
 * ## What this package is
 *
 * The Credda CLI is published to npm as the unscoped package **`credda`**,
 * which owns the `credda` executable. This package ships **no executable**.
 * It is the public mirror of that CLI's command surface, and it exists so the
 * surface is readable, diffable and issue-trackable outside the private
 * engine repository.
 *
 * ## Why it ships no executable
 *
 * Up to 0.1.6 this package installed a binary called `credda` belonging to a
 * different product (a trust-score client, retired). The engine CLI installs a
 * binary called `credda` too, and two packages cannot own one name on a
 * machine: whichever was installed second won, silently. 1.0.0 resolves that by
 * giving the name up. See README.md, "The 0.1.6 break".
 *
 * ## What it exports
 *
 * `args.ts` and `commands.ts`, copied byte for byte from `apps/cli/src/` in the
 * engine repository. Both are dependency-free by construction there — the
 * parser is hand-rolled and the command table is plain data — which is the only
 * reason a faithful copy is possible at all. Everything else in that CLI
 * (`cli.ts`, `doctor.ts`, `triage.ts`, …) reaches into the engine, the
 * database and the sandbox, and is not mirrored here.
 *
 * So what you can do with this package is ask, programmatically and offline,
 * what commands and flags `credda` accepts and what its exit codes mean. What
 * you cannot do with it is run an investigation. Install `credda` for that.
 *
 * The copies are verbatim, with no local edits, so that CI can compare them to
 * the originals by hash. Do not add a header to them.
 */

export {
  GLOBAL_FLAGS,
  parseArgs,
  UsageError,
  boolFlag,
  numberFlag,
  stringFlag,
  type CommandSpec,
  type FlagKind,
  type FlagSpec,
  type FlagValue,
  type GlobalFlags,
  type ParsedCommand,
} from './args.js';

export {
  aliases,
  canonicalCommand,
  COMMANDS,
  commandUsage,
  EXIT,
  EXIT_CODE_HELP,
  RESERVED_EXIT_CODES,
  rootUsage,
} from './commands.js';

/** The npm package that ships the `credda` executable this surface describes. */
export const EXECUTABLE_PACKAGE = 'credda';

/** Where the mirrored files come from, so a reader can find the original. */
export const MIRROR_SOURCE = 'apps/cli/src/ in the Credda engine repository';

/** The files copied verbatim. CI compares each to its original by hash. */
export const MIRRORED_FILES: readonly string[] = ['args.ts', 'commands.ts'];
