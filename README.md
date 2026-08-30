<p align="center">
  <a href="https://credda.io">
    <img alt="Credda" width="96" height="96"
         src="https://raw.githubusercontent.com/Credda-io/credda-cli/main/assets/credda-mark-spectrum.png">
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

> **Not installable yet — re-checked 2026-08-30.** The `credda` package is not on
> the public npm registry (`https://registry.npmjs.org/credda` returns 404), so
> the command above fails today. The latest `@credda/cli` on npm is still
> **0.1.6**, the retired 0.x described below; the `1.0.0` in this repository's
> `package.json` is unpublished on purpose — see [RELEASE.md](RELEASE.md), which
> holds publication until a human has agreed to redefine a live package name.
> Treat this block as what the install *will* be, not as a command that works
> now.

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

A customer labels a bug report or a security vulnerability. Credda reproduces
the failure, diagnoses the cause, writes the patch, proves it with a test that
fails before and passes after, and hands back a diff. Whether that diff becomes a
pull request depends on which mechanism delivered it, and the two answer
differently: the **GitHub App** path opens one with no flag and no switch, for a
run that reaches `READY_FOR_REVIEW` with a proven verdict; the **GitHub Action**
opens none unless you set its `open-pull-request` input, which defaults to
`false`. How often a run reaches a proven fix at all has not been measured. It
proposes and never merges.

The developer surface is [api.credda.io](https://api.credda.io) — the
[API reference](https://api.credda.io/reference) and
[`openapi.json`](https://api.credda.io/openapi.json).

**Status of the fix path, as of 2026-08-23 — superseded, kept because it is the
measurement:** the Fixer, the Verifier and pull-request authoring were built and
tested and off the shipped path. The gate was a model-backed run: across all
seven engine databases in the tree there were **468 investigations, 0 patches
and 0 verification runs**, and every `model_usage` row carried
`provider='heuristic'` with zero tokens (`docs/strategy/v41-gates.md`). There was
deliberately **no flag that turns it on**, because a flag would have put an
unevidenced claim one environment variable away from a customer.

**What changed, 2026-08-27 and 2026-08-28.** A model-backed run happened, which
was the condition the paragraph above named. ADR 0019 superseded ADR 0015's
scoping decision and put the Fixer and the Verifier back on the investigation
path; the following day the engine's forge delivery path was wired to open a
pull request for a run that reaches a proven verdict. That path takes no flag
and no opt-in switch; the `open-pull-request` input that defaults to `false` is
the **GitHub Action**'s, a separate mechanism that runs on the caller's own
runner. The gate that replaced the absent flag is not a flag either: it is
`provider.isGenerative` in the orchestrator, so the stage is entered when a
model-backed provider is configured and skipped when one is not. A heuristic patch is worse than none. See ADR 0018,
*The product is the fix*, and ADR 0019.

What the shipped CLI therefore does today: prepare an environment, reproduce the
reported failure, capture its failure signature as evidence, diagnose a cause
where the evidence supports one, and — where a model-backed provider is
configured — write a patch and prove it. Against the deterministic heuristic
provider it reaches diagnosis and stops there, and reports the stages it did not
enter as not attempted rather than as a measured zero. That rule is older than
this change and survives it: nothing may report a stage that did not run as a
zero.

## The command surface

Read off `src/commands.ts`, which is a byte-for-byte copy of the engine's own
command table. `credda --help` is generated from that same table, so it is the
authority on the copy you installed.

```
credda investigate <repo-path> <description | @file | ->  [options]
```

| Command | What it does |
| --- | --- |
| `investigate` | Reproduce a reported failure, diagnose it, and fix it where the provider allows |
| `triage` | Say what Credda could not use in a report, or say nothing |
| `discover` | Read a checkout and write the bug reports nobody filed. Starts nothing |
| `doctor` | Check that this environment can reproduce a bug |
| `reap` | Remove sandbox containers left behind by an interrupted run |
| `init` | Write a `credda.config.json` with documented defaults |
| `status` | List recent investigations, filtered by repository, state or outcome |
| `report` | Show what an investigation established, and what it did not |
| `inspect` | Show everything one run recorded, in full |
| `events` | Show the event timeline for an investigation |
| `cancel` | Stop a running investigation, or say why it cannot be stopped |
| `validations` | List change-scoped validation runs |
| `validation` | Show one validation: its checks, and the findings they raised |

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
| `--ref` | `<ref>` record where this report came from; stored on the run | — |

Other commands: `triage --repo <path>`; `discover --out <dir>` and
`--max-files <n>`; `report`/`resolution` `--markdown` and
`--patch`; `doctor --deep`; `reap --dry-run --max-age-hours <n>`;
`init --global --force`; `status --repository <path-or-id> --state <state>
--outcome <outcome> --ref <ref> --limit <n> --offset <n>`; `events --since <n>` and
`--follow` (`-f`); `cancel --reason <text>`; `validations --repository <path-or-id>
--state <state> --outcome <outcome> --limit <n> --offset <n>`; `validation
--severity <s> --status <s> --limit <n> --offset <n>`.

`report --patch` writes the unified diff the run recorded on stdout and nothing
else, and exits non-zero when the run recorded no patch, so a script cannot read
an empty document as an empty change. It only reads a finished run: it applies
nothing, delivers nothing, and whether that diff may be proposed to anyone is a
separate question answered by the delivery block that `credda investigate --out`
writes.

`discover` is the narrowest verb on this table and the one most likely to be
read as more than it is. It walks a checkout an operator names, reads its
JavaScript and TypeScript source, and writes ordinary bug reports about the
shapes it saw. It opens no store, creates no investigation and starts no run.
**It has confirmed nothing**: measured against 160 cases from 50 real
repositories, each at a commit where a defect is present and again at the
maintainer's fix, the rules emitted 103 candidates, none of them fell silent at
the fix, and on no case did a rule name the defect the case pins. A candidate is
a report worth a reproduction, never a defect Credda found — and zero candidates
is not a clean bill of health.

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
| 3 | `PATCH_REJECTED`: Credda wrote a change and independent verification rejected it, so the change was discarded and the workspace restored. Nothing is on offer; the diagnosis still stands. Held open and unreused while ADR 0015 was in force, and returned again since ADR 0019 (2026-08-27), so the scripts written against the original table still read it correctly. |
| 4 | Cancelled by the operator. |
| 5 | `NO_RUNNABLE_CHECK`: nothing runnable could be derived from the report. A fact about the report, not about your code, kept separate from 0 so `credda … && deploy` cannot read it as a pass. |
| 6 | `COMMENT_READY`, from `triage` only: there is a comment and it is on stdout. |
| 7 | `CANCELLATION_REQUESTED`, from `cancel` only: a run is still executing and has been asked to stop. **It has not stopped.** It tears its sandbox down and writes its own terminal state at its next checkpoint; follow it with `credda events <id> --follow`. |

`credda cancel` exits 0 only when nothing is running, and 7 when a run was
merely asked to stop. They are two codes because they are two claims: 0 says the
machine is quiet, so `credda cancel $id && deploy` is safe, and 7 does not
satisfy it. 7 is also not 4 — 4 is a run reporting that it ended, 7 is a
different process reporting that it asked one to, without knowing whether it
did. A run this machine cannot reach exits 2 and **nothing is written to it**,
because marking it cancelled would be a state the still-running engine
overwrites minutes later, having spent the whole budget you thought you stopped.

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

[`examples/surface.mjs`](examples/surface.mjs) is that, worked through end to
end — reading the verbs, resolving an alias, parsing a command line, watching a
bad flag value be refused, and checking the exit-code contract a calling script
branches on. Run it:

```sh
npm install && npm run build && npm run example
```

It asserts with `node:assert/strict` and CI runs it on every push, so it exits
non-zero the moment any of that stops being true.

It cannot run an investigation, and it does not pretend to. Canonical
development happens in the engine repository; this repo carries the source and
the issues.

## Contributing

Issues here are read. Pull requests against `src/args.ts` and `src/commands.ts`
cannot be merged here — they would be overwritten by the next copy — so open an
issue describing the change to the surface instead.

## License

MIT © Credda. See [LICENSE](LICENSE).
