<p align="center">
  <a href="https://credda.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Credda-io/credda-cli/main/assets/credda-lockup-white.png">
      <img alt="Credda" src="https://raw.githubusercontent.com/Credda-io/credda-cli/main/assets/credda-lockup-black.png" width="480">
    </picture>
  </a>
</p>

# @credda/cli

**This package installs no command.** It is the public source mirror and issue
tracker for the command surface of the Credda CLI, which is published to npm
under its own, unscoped name:

```sh
npm install -g credda     # the CLI itself
credda --help
```

Node 24 or newer for `credda`. This mirror package needs Node 18 and is a
library, not a tool.

> ### The 0.1.6 break
>
> Up to and including **0.1.6**, `npm i -g @credda/cli` installed something
> else entirely: a client for a 0–100 reliability score and portable trust
> credentials. Credda no longer builds that product, and every one of those
> commands is gone from **1.0.0**.
>
> 0.1.6 also installed a binary named `credda`. So does the `credda` package.
> Two packages cannot own one executable name, so this one gives it up: 1.0.0
> declares no `bin`. If you depend on the old behaviour, **pin
> `@credda/cli@0.1.6`** — it is untouched and still on the registry, nothing has
> been unpublished — and read [CHANGELOG.md](CHANGELOG.md) for the migration.

## What Credda is

Credda finds defects and vulnerabilities in a company's production and QA
environments, reproduces the failure, and reports what it established and what
it did not. The product it is being built toward opens a pull request carrying a
fix and the test that proves it; it proposes and never merges.

**Status of the fix path, as of 2026-08-23:** the Fixer, the Verifier and
pull-request authoring are built and tested and are off the shipped path. The
gate is a model-backed run: across all seven engine databases in the tree there
were **468 investigations, 0 patches and 0 verification runs**, and every
`model_usage` row carried `provider='heuristic'` with zero tokens
(`docs/strategy/v41-gates.md`). Restoring the path is the plan of record and its
procedure is written down; there is deliberately **no flag that turns it on**,
because a flag would put an unevidenced claim one environment variable away from
a customer. Metrics for stages that have not run report `NOT_ATTEMPTED_IN_V1`
rather than a measured zero. See ADR 0018, *The product is the fix*.

What the shipped CLI therefore does today: prepare an environment, reproduce the
reported failure, capture its failure signature as evidence, diagnose a cause
where the evidence supports one, and report all of it. It edits no code and
needs no write access to reach that.

## The command surface

Read off `src/commands.ts`, which is a byte-for-byte copy of the engine's own
command table. `credda --help` is generated from that same table, so it is the
authority on the copy you installed.

```
credda investigate <repo-path> <description | @file | ->  [options]
```

| Command | What it does |
| --- | --- |
| `investigate` | Reproduce a reported failure and report what was found |
| `triage` | Say what Credda could not use in a report, or say nothing |
| `doctor` | Check that this environment can reproduce a bug |
| `reap` | Remove sandbox containers left behind by an interrupted run |
| `init` | Write a `credda.config.json` with documented defaults |
| `status` | List recent investigations |
| `report` | Show what an investigation established, and what it did not |
| `inspect` | Show everything one run recorded, in full |
| `events` | Show the event timeline for an investigation |

Aliases, kept permanently because docs, scripts and the external benchmark
harness use them: **`fix`** and **`resolve`** are `investigate`; **`resolution`**
is `report`. They parse identically. Their `--help` prints what the command
actually produces, so an old name is never read as a promise about the output.

### Flags

`investigate` (and its aliases):

| Flag | Value | Default |
| --- | --- | --- |
| `--sandbox` | `local` \| `native` \| `docker` | `local` |
| `--provider` | `auto` \| `heuristic` \| `openai-compatible` | `auto` |
| `--budget-minutes` | `<n>` wall-clock budget | `20` |
| `--max-turns` | `<n>` model calls across all agent roles | `120` |
| `--out` | `<file>` also write this run's machine-readable result as JSON | — |

Other commands: `triage --repo <path>`; `report`/`resolution` `--markdown`;
`doctor --deep`; `reap --dry-run --max-age-hours <n>`; `init --global --force`;
`status --limit <n>`; `events --since <n>` and `--follow` (`-f`).

Global: `--help` (`-h`), `--version`, `--json`, `--quiet`, `--verbose`,
`--no-color`.

A description is given inline, as `@file`, or as `-` for stdin. `credda triage`
takes a file and never an inline string, because the body is text a stranger
typed and a file name does not go through a shell.

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | The answer was reached and nothing failed. Abstention is a success: `NO_CHANGE_REQUIRED` and `INCONCLUSIVE` both exit 0. For `triage`, 0 means it correctly had nothing to say. |
| 1 | Internal error. Credda failed; no verdict. |
| 2 | Usage error. Nothing was run. |
| 3 | **Reserved**, `PATCH_REJECTED`. Held open rather than reused; no run of this version returns it. |
| 4 | Cancelled by the operator. |
| 5 | `NO_RUNNABLE_CHECK`: nothing runnable could be derived from the report. A fact about the report, not about your code, kept separate from 0 so `credda … && deploy` cannot read it as a pass. |
| 6 | `COMMENT_READY`, from `triage` only: there is a comment and it is on stdout. |

Triage's silence is exit 0 and its comment is exit 6, that way round on purpose:
about half of real inbound issues produce nothing worth saying, and every way of
misreading the code then fails toward not posting. Do **not** write
`credda triage issue.md > c.md && post c.md` — it posts on the silent path and
stays quiet on the speaking one.

### Environment

`CREDDA_HOME`, `CREDDA_PROVIDER`, `CREDDA_MODEL`, `CREDDA_SANDBOX`,
`CREDDA_LOG_LEVEL`, `NO_COLOR`, plus `ANTHROPIC_API_KEY`,
`CREDDA_OPENAI_API_KEY` (`NVIDIA_API_KEY` accepted as a second name),
`CREDDA_OPENAI_BASE_URL`, `CREDDA_OPENAI_MODEL` and `CREDDA_OPENAI_RPM`.
`credda --help` documents each. Configuration precedence, highest first: the
flag, the environment variable, `credda.config.json` searched upward from the
working directory then `$CREDDA_HOME/credda.config.json`, the built-in default.

## What is in this repository

```
src/args.ts       copied verbatim from the engine's apps/cli/src/args.ts
src/commands.ts   copied verbatim from the engine's apps/cli/src/commands.ts
src/index.ts      this package's export surface (mirror-only, written here)
```

Those two files are copied rather than summarised because they are
dependency-free in the engine by construction — the parser is hand-rolled and
the table is plain data — so a faithful copy is possible and CI can compare each
to its original by hash. **Do not hand-edit them**; change the engine and copy
across. Everything else in that CLI reaches into the engine, the database and
the sandbox, and is not mirrored.

So this package answers, offline, what `credda` accepts:

```ts
import { COMMANDS, EXIT, rootUsage, parseArgs } from '@credda/cli';
```

It cannot run an investigation, and it does not pretend to. Canonical
development happens in the engine repository; this repo carries the source and
the issues.

## Contributing

Issues here are read. Pull requests against `src/args.ts` and `src/commands.ts`
cannot be merged here — they would be overwritten by the next copy — so open an
issue describing the change to the surface instead.

## License

MIT © Credda. See [LICENSE](LICENSE).
