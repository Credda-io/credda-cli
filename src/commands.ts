/**
 * The command table. This is the single source of truth for what the CLI
 * accepts: the parser validates against it and `--help` is rendered from it,
 * so documented flags and accepted flags cannot drift apart.
 *
 * ## What this CLI claims, and what it does not
 *
 * A run prepares an environment, reproduces the reported failure, captures its
 * signature as evidence, diagnoses a cause where the evidence supports one,
 * writes the patch and proves it with a test that fails before and passes
 * after. It ends at a diff for a person to review. **It proposes and never
 * merges**, and nothing here takes write access to a repository to do it.
 *
 * **How far a run goes is decided by the provider, not by a flag.** The fix
 * stage is on the investigation path (ADR 0019) and is entered only when the
 * configured provider can author code. Under `CREDDA_PROVIDER=auto` with no
 * key the engine degrades to rule-based reasoning and stops after the
 * diagnosis, because a rule-based patch is worse than none. `PATCH_PATH_STATES`
 * in `packages/shared/src/states.ts` carries that gate and the evidence behind
 * it. There is deliberately no switch here that overrides it: a flag would put
 * an unevidenced claim one environment variable away from a customer.
 *
 * Two consequences this file carries: the old command names keep working and
 * stop describing an output (see {@link INVESTIGATE}), and exit code 3 is
 * reserved rather than reused (see {@link RESERVED_EXIT_CODES}).
 */

import { GLOBAL_FLAGS, type CommandSpec, type FlagSpec } from './args.js';

/**
 * Exit codes. Documented here, in `--help`, and in docs/cli.md.
 *
 * An investigation that abstains is a success: NO_CHANGE_REQUIRED and
 * INCONCLUSIVE both exit 0. Every non-zero code an investigation can return is
 * a genuine failure.
 *
 * `credda triage` is the one command with two successful codes, and the second of
 * them is non-zero. It is not an investigation and has no Outcome: it executes
 * nothing, so "did it reach a verdict" is not a question about it. What a caller
 * needs from it is which of two correct answers it gave, and 0 is the silent
 * one. See {@link EXIT.COMMENT_READY} for why that way round.
 *
 * The report record (ADR 0012) adds no code, and the omission is a decision. Its
 * confidence class is the obvious candidate -- something like "5:
 * NOT_ESTABLISHED" -- and it is the wrong thing to encode. `NOT_ESTABLISHED` is
 * the *correct* class for an abstention, which is the outcome this table already
 * spends two of its five codes insisting is a success; giving it a non-zero code
 * would make every CI that treats non-zero as failure fail on exactly the runs
 * Credda gets right, and would create a second, contradictory answer to a
 * question `outcome` already answers. The confidence class is a property of the
 * record, readable with `credda report <id> --json`, and the exit code stays a
 * statement about whether the run reached a verdict.
 *
 * ## Code 3 was held open, and is returned again
 *
 * `PATCH_REJECTED` is the exit code of a run that produced a change and then
 * threw it away. ADR 0015 stopped anything from producing changes and held the
 * code open rather than renumbering the table; ADR 0019 put the fix stage back
 * on the path, so runs return 3 again and it means exactly what the old scripts
 * were written against. {@link RESERVED_EXIT_CODES} is empty as a result, and
 * kept, because a test reads it and a code moving between reserved and returned
 * should move its reason with it.
 */
export const EXIT = {
  /** Success, including NO_CHANGE_REQUIRED and INCONCLUSIVE. */
  SUCCESS: 0,
  /** Credda itself failed: internal error, unreadable database, crash. */
  INTERNAL_ERROR: 1,
  /** The command line or its inputs were wrong. Nothing was run. */
  USAGE_ERROR: 2,
  /** A change was produced and independent verification rejected it. */
  PATCH_REJECTED: 3,
  /** The run was cancelled (Ctrl-C). */
  CANCELLED: 4,
  /**
   * NO_RUNNABLE_CHECK: nothing runnable could be derived from the report, so
   * nothing was executed against the repository. Not a success and not a crash.
   * See `exitCodeFor` for why it is neither 0 nor 1.
   */
  NO_RUNNABLE_CHECK: 5,
  /**
   * `credda triage` produced a comment, and it is on stdout. Nothing failed.
   *
   * ## Why the comment is the non-zero side and silence is 0
   *
   * Silence is the common case, not the exceptional one: half of real inbound
   * produces nothing worth saying (`bench/harvest`, 50.6% of 729 issues). A
   * code that turned every second opened issue into a red job would be switched
   * off inside a week, and this repository's standing rule is already that
   * abstention is a success. So silence exits 0, and it is 0 for the same
   * reason NO_CHANGE_REQUIRED is.
   *
   * That leaves the comment needing a code of its own, because "post this" and
   * "post nothing" are the two answers a caller has to tell apart and stdout
   * being empty is a weaker signal than a number. Giving it a non-zero one is
   * deliberate rather than reluctant: **every way of misreading this code then
   * fails towards not posting.** A shell under `set -e` stops before the
   * posting step; a caller that ignores the code and pipes stdout gets an empty
   * document on the silent path; a caller that tests for 0 posts only silence,
   * which posts nothing. The failure this product cannot afford is a
   * confidently wrong refusal on a stranger's issue -- the dominant rule is
   * still wrong 8.7% of the times it fires (Credda-io/core#7) -- so the
   * direction of every mistake here has to be silence.
   *
   * 6 rather than reusing 5: NO_RUNNABLE_CHECK is a statement that nothing was
   * executed against the repository, which is true of *every* triage run by
   * design, so the two would stop meaning different things.
   */
  COMMENT_READY: 6,
} as const;

/**
 * Codes no run of this version can return, and the reason each is held open.
 *
 * A test reads this, so a code cannot quietly move between "reserved" and
 * "returned" without the reason moving with it.
 */
export const RESERVED_EXIT_CODES: Readonly<Record<number, string>> = {};

export const EXIT_CODE_HELP: readonly string[] = [
  '  0  Credda reached the answer it was asked for and nothing failed. For a run',
  '     that executed something against this repository, that means its finding is',
  '     on record: REPRODUCED_AND_DIAGNOSED, REPRODUCED_NOT_DIAGNOSED,',
  '     NO_CHANGE_REQUIRED or INCONCLUSIVE. Abstention is a success here, and',
  '     Credda declining to allege a defect it did not demonstrate is a feature.',
  '     For `credda triage`, which executes nothing at all, 0 means it correctly had',
  '     nothing to say -- see 6.',
  '  1  Internal error. Credda failed; the investigation did not reach a verdict.',
  '  2  Usage error. A bad flag, a missing value, or an input that could not be read.',
  '  3  PATCH_REJECTED. Credda wrote a change and independent verification rejected it,',
  '     so it was discarded and the workspace restored. No change is on offer. The',
  '     diagnosis still stands and is worth reading.',
  '  4  Cancelled by the operator (Ctrl-C).',
  '  5  NO_RUNNABLE_CHECK. Nothing runnable could be derived from the report, so',
  '     nothing was executed. This is a fact about the report, not about your code,',
  '     and it is separated from 0 so `credda ... && deploy` cannot read it as a pass.',
  '  6  COMMENT_READY, from `credda triage` only: there is a comment to post and it is',
  '     on stdout. Nothing failed. Triage exits 0 when it correctly has nothing to',
  '     say, which is about half of real issues, so 0 there is silence and 6 is the',
  '     one that means speak.',
];

/**
 * `investigate`, with `resolve` and `fix` as permanent aliases for it.
 *
 * ## Why the name moved twice
 *
 * `fix` named a stage. `resolve` named the whole workflow. Both were accurate
 * about the destination and wrong about the guarantee: a run reproduces,
 * diagnoses, and then patches and verifies only where the evidence and the
 * provider let it, and a name that promises a fix promises an outcome no run
 * can commit to in advance. `investigate` names what every run does; how far
 * it gets is reported rather than asserted by the verb.
 *
 * ## Why both old names still work
 *
 * Neither is deprecated and neither will be removed. `fix` and `resolve` appear
 * in docs/cli.md, README.md, docs/setup.md and in bench/external's harness
 * invocation, and they are in people's fingers. A command name that silently
 * stops working is a worse failure than an inconsistent one. All three
 * spellings parse identically, print their own name in usage and errors, and
 * dispatch through {@link canonicalCommand}.
 *
 * What the old names must NOT do is carry their old promise. `credda fix --help`
 * prints this command's summary, which says what the run produces, so nobody
 * reads the name as a description of the output.
 */
const INVESTIGATE: CommandSpec = {
  name: 'investigate',
  summary: 'Reproduce a reported failure, diagnose it, and fix it where the provider allows',
  args: '<repo-path> <description | @file | ->  [options]',
  flags: {
    sandbox: {
      kind: 'string',
      choices: ['local', 'native', 'docker'],
      valueName: '<local|docker>',
      description: 'Execution plane. local runs repository code directly on this host',
      defaultNote: 'local',
    },
    provider: {
      kind: 'string',
      choices: ['auto', 'heuristic', 'openai-compatible'],
      valueName: '<auto|heuristic|openai-compatible>',
      description:
        'auto uses ANTHROPIC_API_KEY then CREDDA_OPENAI_API_KEY when present;\n' +
        '                      heuristic forces rule-based reasoning; openai-compatible\n' +
        '                      targets an OpenAI-compatible endpoint (NVIDIA NIM by default)',
      defaultNote: 'auto',
    },
    'budget-minutes': {
      kind: 'number',
      valueName: '<n>',
      description: 'Wall-clock budget for the investigation',
      defaultNote: '20',
    },
    'max-turns': {
      kind: 'number',
      valueName: '<n>',
      description: 'Maximum model calls across all agent roles',
      defaultNote: '120',
    },
    out: {
      kind: 'string',
      valueName: '<file>',
      description: 'Also write the machine-readable result of this run to <file> as JSON',
    },
  },
  details: [
    'What a run does, and where it stops:',
    '  prepare an environment, reproduce the reported failure, capture its',
    '  failure signature, and diagnose a cause where the evidence supports one.',
    '  It then reports all of it. Credda does not edit your code, does not',
    '  open a change proposal, and needs no write access to reach any of this.',
    '',
    'Description sources:',
    '  "text"     a short description given inline',
    '  @file      read the report from a file (shells truncate multi-line arguments)',
    '  -          read the report from stdin',
    '',
    'Configuration precedence, highest first:',
    '  1. the CLI flag on this command line',
    '  2. the environment variable (CREDDA_SANDBOX, CREDDA_PROVIDER)',
    '  3. credda.config.json, searched upward from the working directory,',
    '     then $CREDDA_HOME/credda.config.json',
    '  4. the built-in default',
    '',
    'Create a config file with: credda init',
    '',
    'The report this produces:  credda report <id>',
  ],
};

/**
 * `report`, with `resolution` as a permanent alias for it.
 *
 * ADR 0012 named this record a *resolution* when the pipeline ended in a patch
 * and a pull request. The record itself has not changed shape, but what a run
 * can fill in has: Change and Verification are stages this version does not
 * perform, so a record produced today carries neither, and calling that a
 * resolution names something the run did not do. `report` names what it is.
 *
 * `resolution` keeps working, for the same reason `fix` does.
 */
const REPORT: CommandSpec = {
  name: 'report',
  summary: 'Show what an investigation established, and what it did not',
  args: '<investigation-id-or-prefix> [--json] [--markdown]',
  flags: {
    markdown: {
      kind: 'boolean',
      description:
        'Emit the report as Markdown: the same document Credda posts to a\n' +
        '                      pull request. Pipe it, paste it, or commit it',
    },
  },
  details: [
    'The record (ADR 0012): Bug, Evidence, Reproduction, Root Cause and',
    'Confidence, which is everything this version of Credda performs.',
    '',
    'Two further sections, Change and Verification, are printed only for an',
    'older record that carries them. Credda writes no changes now, so a run',
    'started today reaches neither, and both say so rather than going quiet.',
    '',
    'Every section is derived from something that was executed and recorded, or',
    'it is absent. A section with nothing behind it is not filled in -- the hole',
    'is named under Confidence instead.',
    '',
    'Confidence is an ordinal class -- ESTABLISHED, PARTIALLY_ESTABLISHED or',
    'NOT_ESTABLISHED -- and the list of what this record does not establish. It',
    'is never a percentage: Credda has no calibrated probability model, and the',
    'field a reviewer reads to decide how much to trust a finding is the worst',
    'place to invent a number.',
    '',
    'Any unambiguous prefix of an investigation id is accepted.',
    '',
    '--markdown emits the same document the forge delivery posts, which until now',
    'was reachable only from a webhook. It leads with what the investigation did',
    'NOT establish, and it says in its own words that no code was written and',
    'nothing above has been shown to be fixed. That section is the point; do not',
    'strip it before sharing the rest.',
  ],
};

/**
 * `credda triage`: read one report, say what Credda could not use in it, or say
 * nothing at all.
 *
 * ## Why it is called triage, and what the name must never come to mean
 *
 * Every other name considered here promised something the command does not do,
 * which is the mistake {@link INVESTIGATE} spent two renames undoing. `decline`
 * and `reply` both take the issue as their object -- "decline this issue" reads
 * as a verdict on the reporter, and the copy this command prints is built
 * around never being one. `decline-reply`, after the package it renders
 * through, names the artefact exactly but is the only hyphenated command in a
 * table of single words.
 *
 * `triage` is the maintainer's own word for the thing this does: look at an
 * inbound report without doing the work, and say what would be needed. It is
 * accurate today and it has one way to go wrong, so it is written down -- **this
 * command must never label, close, assign, prioritise or otherwise decide
 * anything about an issue.** It reads a file and prints a comment or nothing.
 * The day it does more than that, the name is a promise again and has to move.
 *
 * ## Why it takes a file and never a string
 *
 * The body is text a stranger typed. The launcher's `run.mjs`
 * (Credda-io/action) documents at length why
 * it may never reach a shell, and the same reasoning applies one layer up: an
 * argument goes through a shell, a file name does not. {@link INVESTIGATE}
 * accepts `@file` alongside inline text because a person at a terminal has a
 * sentence in their head; this command exists to be invoked by a workflow on
 * text nobody has read, so the inline form is not offered at all.
 */
const TRIAGE: CommandSpec = {
  name: 'triage',
  summary: 'Say what Credda could not use in a report, or say nothing',
  args: '<issue-file> [--repo <path>]',
  flags: {
    repo: {
      kind: 'string',
      valueName: '<path>',
      description:
        'A checkout of the repository the report was filed against. Without it\n' +
        '                      Credda assumes it knows nothing about the repository, which is\n' +
        '                      the reading that invents the least',
    },
  },
  details: [
    'What a run does, and what it costs:',
    '  it reads the report, mines it for a runnable reproduction exactly as an',
    '  investigation would, and renders the refusals into one short comment. No',
    '  sandbox, no container, no install, no network, no model call and no API',
    '  key -- nothing is executed and nothing is written. It is cheap enough to',
    '  run on every issue the moment it is opened.',
    '',
    'What it prints:',
    '  the comment on stdout, or nothing on stdout. There is no third form.',
    '  Diagnostics go to stderr, so `credda triage issue.md > comment.md` yields',
    '  either the comment or an empty file.',
    '',
    'Silence is the common outcome and it is a correct one. Measured over 729',
    'real inbound issues, about half contain nothing Credda could ask for and a',
    'quarter produce a specific request (bench/harvest). A comment that names',
    'nothing the reporter could act on is not written, because a bot that posts',
    'generic advice on every issue is a bot that gets muted.',
    '',
    'Exit code, not stdout, is what says which happened:',
    '  6  there is a comment, and it is on stdout',
    '  0  there is correctly nothing to say',
    'Do NOT write `credda triage issue.md > c.md && post c.md`: that posts on the',
    'silent path and stays quiet on the speaking one, which is the wrong way',
    'round twice.',
    '',
    'This is not an investigation and makes no claim about the repository. It',
    'never says a bug is absent, because it never ran anything. The full',
    'reproduce-and-report run is:  credda investigate <repo-path> @<issue-file>',
  ],
};

export const COMMANDS: Readonly<Record<string, CommandSpec>> = {
  investigate: INVESTIGATE,

  triage: TRIAGE,

  doctor: {
    name: 'doctor',
    summary: 'Check that this environment can reproduce a bug',
    args: '[<repo-path>] [--deep]',
    flags: {
      deep: {
        kind: 'boolean',
        description:
          'Also build or pull the sandbox image and probe its toolchain. Uses\n' +
          '                      the network and can take minutes, so it is opt-in',
      },
    },
    details: [
      'Reports pass / warn / fail for the Node version, git, the active model',
      'provider, the selected sandbox, and CREDDA_HOME. Exits non-zero only when',
      'something is genuinely broken; warnings alone exit 0.',
      '',
      'With a <repo-path>, it also reports whether that repository could be',
      'prepared at all: the package manager and the exact install command a run',
      'would use, and the test, build and typecheck commands it would find. That',
      'is a plan read off the repository, not a run of it -- nothing is installed',
      'and nothing is executed.',
      '',
      '--deep additionally builds or pulls the docker sandbox image and probes its',
      'toolchain, which is the step that decides whether reproduction can happen',
      'at all. It uses the network and can take minutes, so it is opt-in.',
    ],
  },

  reap: {
    name: 'reap',
    summary: 'Remove sandbox containers left behind by an interrupted run',
    args: '[--dry-run] [--max-age-hours <n>]',
    flags: {
      'dry-run': {
        kind: 'boolean',
        description: 'List what would be removed and remove nothing',
      },
      'max-age-hours': {
        kind: 'string',
        description:
          'Only reap containers older than this. Default 4, which is far above\n' +
          '                      any real investigation',
      },
    },
    details: [
      'A sandbox container is removed when the investigation that made it finishes.',
      'If that process is killed instead -- SIGKILL, a crash, a closed terminal on a',
      'long benchmark -- nothing removes it, and it keeps its memory reservation and',
      'its volume until somebody notices. Three of them once ran for seventeen hours',
      'on this machine.',
      '',
      'This removes sandbox containers older than --max-age-hours, then the sandbox',
      'volumes nothing references any more. Age is the test because it has no false',
      'positives above a threshold no real run reaches; the default of four hours is',
      'roughly twenty times the slowest case ever measured.',
      '',
      'It acts on containers this process did not create, so on a shared docker',
      'daemon it can reach somebody else\'s run. Read --dry-run first.',
    ],
  },

  init: {
    name: 'init',
    summary: 'Write a credda.config.json with documented defaults',
    args: '[--global] [--force]',
    flags: {
      global: {
        kind: 'boolean',
        description: 'Write to $CREDDA_HOME/credda.config.json instead of the current directory',
      },
      force: { kind: 'boolean', description: 'Overwrite an existing config file' },
    },
  },

  status: {
    name: 'status',
    summary: 'List recent investigations',
    args: '[--limit <n>] [--json]',
    flags: {
      limit: { kind: 'number', valueName: '<n>', description: 'How many to list', defaultNote: '20' },
    },
  },

  report: REPORT,

  inspect: {
    name: 'inspect',
    summary: 'Show everything one run recorded, in full',
    args: '<investigation-id-or-prefix>',
    flags: {},
    details: [
      'Any unambiguous prefix of an investigation id is accepted.',
      '',
      'This is the run: the reproduction, every hypothesis including the refuted',
      'ones, and the evidence records. For what the run established and what it',
      'did not, use: credda report <id>',
    ],
  },

  events: {
    name: 'events',
    summary: 'Show the event timeline for an investigation',
    args: '<investigation-id-or-prefix> [--since <n>] [--follow] [--json]',
    flags: {
      since: {
        kind: 'number',
        valueName: '<n>',
        description: 'Only events with a sequence number greater than <n>',
      },
      follow: {
        kind: 'boolean',
        alias: 'f',
        description: 'Tail a running investigation until it reaches a terminal state',
      },
    },
    details: ['Any unambiguous prefix of an investigation id is accepted.'],
  },

  /*
   * The two former names. Kept permanently, and kept honest: each takes the
   * canonical command's flags, details and behaviour, and only the summary line
   * differs, so `credda fix --help` never reads as a promise to write one.
   */
  resolve: {
    ...INVESTIGATE,
    name: 'resolve',
    summary: "Alias for 'credda investigate', kept because scripts and docs use it",
    aliasOf: 'investigate',
  },

  fix: {
    ...INVESTIGATE,
    name: 'fix',
    summary: "Alias for 'credda investigate', kept because scripts and docs use it",
    aliasOf: 'investigate',
  },

  resolution: {
    ...REPORT,
    name: 'resolution',
    summary: "Alias for 'credda report', kept because scripts and docs use it",
    aliasOf: 'report',
  },
};

/**
 * The command an alias dispatches to. Unknown names are returned unchanged so
 * the caller's own "unknown command" path still owns that message.
 */
export function canonicalCommand(name: string): string {
  return COMMANDS[name]?.aliasOf ?? name;
}

/** Alias name to the command it stands for, for the root usage. */
export function aliases(): readonly (readonly [string, string])[] {
  return Object.entries(COMMANDS)
    .filter(([, spec]) => spec.aliasOf !== undefined)
    .map(([name, spec]) => [name, spec.aliasOf as string] as const);
}

const ENVIRONMENT: readonly (readonly [string, string])[] = [
  ['CREDDA_HOME', 'Where Credda stores its database and evidence (default ./.credda)'],
  [
    'ANTHROPIC_API_KEY',
    'Enables the Anthropic provider. Without it reasoning is rule-based,\n' +
      '                      which reaches a reproduction but rarely a diagnosis; every\n' +
      '                      report says which provider produced it.',
  ],
  [
    'CREDDA_PROVIDER',
    "'auto', 'heuristic' or 'openai-compatible'. 'heuristic' forces the\n" +
      '                      deterministic provider',
  ],
  ['CREDDA_MODEL', 'Overrides the Anthropic model id'],
  [
    'CREDDA_OPENAI_API_KEY',
    'Enables the openai-compatible provider (NVIDIA NIM by default).\n' +
      '                      NVIDIA_API_KEY is accepted as a second name.',
  ],
  ['CREDDA_OPENAI_BASE_URL', 'OpenAI-compatible base URL (default NVIDIA NIM)'],
  ['CREDDA_OPENAI_MODEL', 'Model id served by that endpoint'],
  [
    'CREDDA_OPENAI_RPM',
    'Client-side request pacing (default 40, NVIDIA free-tier limit)',
  ],
  [
    'CREDDA_SANDBOX',
    "'local' (this command's default), 'native' or 'docker'. local and native\n" +
      '                      run repository code directly on this host, and only a local credda\n' +
      '                      invocation may select them: a repository arriving any other way\n' +
      '                      is refused them and must use docker. Credda never falls back\n' +
      '                      silently in either direction.',
  ],
  ['CREDDA_LOG_LEVEL', 'debug | info | warn | error (default warn)'],
  ['NO_COLOR', 'Set to any value to disable ANSI colour'],
];

export function rootUsage(): string {
  const lines: string[] = [
    'credda - something broke, find out what',
    '',
    'Usage: credda <command> [options]',
    '',
    'Workflow: signal -> investigate -> reproduce -> diagnose -> report.',
    'Credda reports what it found and stops there. It does not edit your code,',
    'it does not open a change proposal, and it needs no write access to do this.',
    '',
    'Commands:',
  ];

  const named = Object.values(COMMANDS).filter((command) => command.aliasOf === undefined);
  const width = Math.max(...named.map((c) => c.name.length));
  for (const command of named) {
    lines.push(`  ${command.name.padEnd(width)}  ${command.summary}`);
  }

  const aliased = aliases();
  if (aliased.length > 0) {
    lines.push('', 'Aliases:');
    for (const [alias, target] of aliased) {
      lines.push(`  ${alias.padEnd(width)}  ${target}, under its former name. Both are supported.`);
    }
  }

  lines.push('', 'Global options:');
  lines.push(...renderFlags(GLOBAL_FLAGS));

  lines.push('', 'Environment:');
  for (const [name, description] of ENVIRONMENT) {
    lines.push(`  ${name.padEnd(19)} ${description}`);
  }

  lines.push('', 'Exit codes:');
  lines.push(...EXIT_CODE_HELP);

  lines.push('', "Run 'credda <command> --help' for options specific to a command.");
  return lines.join('\n');
}

export function commandUsage(name: string): string {
  const spec = COMMANDS[name];
  if (spec === undefined) return rootUsage();

  const lines: string[] = [
    `credda ${spec.name} - ${spec.summary}`,
    '',
    `Usage: credda ${spec.name} ${spec.args}`.trimEnd(),
  ];

  if (spec.aliasOf !== undefined) {
    /*
     * What the command DOES, before the note about what it is called.
     *
     * An alias whose summary line reads "Alias for 'credda investigate'" tells a
     * reader nothing about the output, and this is the help a person reaches
     * when the name in their fingers is the one that used to promise a patch.
     * The canonical summary is restated here so the answer is on the screen
     * rather than one command away.
     */
    const target = COMMANDS[spec.aliasOf];
    if (target !== undefined) lines.push('', `What it does: ${target.summary.toLowerCase()}.`);
    lines.push(
      '',
      `'credda ${spec.name}' and 'credda ${spec.aliasOf}' are the same command. ${spec.aliasOf} is the`,
      'current name; this one is kept permanently, because docs, scripts and the',
      "external benchmark harness use it and a name in someone's fingers that stops",
      'working is worse than one that is out of date. The name is the only thing',
      'that is out of date.',
    );
  }

  if (Object.keys(spec.flags).length > 0) {
    lines.push('', 'Options:');
    lines.push(...renderFlags(spec.flags));
  }

  lines.push('', 'Global options:');
  lines.push(...renderFlags(GLOBAL_FLAGS));

  if (spec.details !== undefined) lines.push('', ...spec.details);

  lines.push('', 'Exit codes:');
  lines.push(...EXIT_CODE_HELP);
  return lines.join('\n');
}

function renderFlags(flags: Readonly<Record<string, FlagSpec>>): readonly string[] {
  const entries = Object.entries(flags).map(([name, spec]) => {
    const alias = spec.alias === undefined ? '    ' : `-${spec.alias}, `;
    const value = spec.kind === 'boolean' ? '' : ` ${spec.valueName ?? '<value>'}`;
    return [`  ${alias}--${name}${value}`, spec, name] as const;
  });

  const width = Math.max(...entries.map(([left]) => left.length));
  return entries.map(([left, spec]) => {
    const suffix = spec.defaultNote === undefined ? '' : ` (default: ${spec.defaultNote})`;
    return `${left.padEnd(width)}  ${spec.description}${suffix}`;
  });
}
