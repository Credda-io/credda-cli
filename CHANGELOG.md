# Changelog

## Unreleased — the mirror regains `sweep` and `docscan`

**Not published.** `@credda/cli` on npm is still 1.0.0 and its `COMMANDS` table
still has thirteen commands. Everything below is true of this repository and of
the engine CLI; it becomes true of the installed package only when someone
publishes. Read the npm version, not this heading, when you are asking what your
`node_modules` contains.

The mirrored `src/args.ts` and `src/commands.ts` had drifted from
`apps/cli/src/` in the engine repository: two commands landed there
(`sweep`, engine commit `5632a8e`; `docscan`, engine commit `ec595c5`) and the
copies here predated both, so the surface-parity gate was red and the published
table under-reported what `credda` accepts.

### Added to the mirrored surface

- **`sweep <repo-path>`** — discover, investigate each candidate up to
  `--max-candidates`, and, only with `--open-pull-request`, open one pull
  request per run that carries a verified change. Also `--cost-ceiling <usd>`,
  `--max-files`, `--sandbox`, `--provider`, `--budget-minutes`, `--max-turns`.
  It runs no reproduce, fix or verify logic of its own. Without the opt-in flag
  it writes to nothing. Credda proposes and never merges.
- **`docscan <repo-path>`** — execute a checkout's own documented examples and
  list the ones whose output contradicts the documented value, CONFIRMED first.
  `--confirmed-only`. Every finding is either a code bug or a stale doc and the
  command never decides which. It opens no PR and changes no file. It executes
  examples in `node -e` child processes on the host, which is process isolation
  and **not** the engine sandbox.

### Changed

- `src/args.ts`'s header no longer claims "13 commands, 3 aliases and 27 flags".
  The engine's copy now says fifteen commands, three aliases and dozens of
  flags, and declines to give an exact flag count on purpose.
- The README command table, flag list and `examples/surface.mjs` follow the
  table rather than a snapshot of it.
- `src/cli.test.ts`'s write-flag guard was an exact-name blocklist holding
  `pull-request`, which `sweep --open-pull-request` walked straight past. It now
  matches the shape of a write-flag name and carries the flags that legitimately
  match as a written, reviewed exception list, so a future one arrives as a
  failure to be read rather than a green tick.

## 1.0.0 — 2026-09-08 — BREAKING: this package no longer installs a `credda` command

**If you installed `@credda/cli` at 0.1.6 or earlier, upgrading removes a binary
you may be using. Read this before upgrading, and pin `0.1.6` if you need the
old behaviour while you migrate.**

### What changed

Every version up to and including 0.1.6 published a different product under this
name: a command-line client for a 0–100 reliability score and portable
trust credentials, a thin client over `@credda/js`. Credda no longer builds that
product. All of its commands — `score`, `explain`, `components`, `risk`,
`verify`, `lookup`, `export`, `mint`, `revoke`, `confirmations`, `references`,
`policies`, `monitors`, `screen`, `webhooks`, `listen` and the rest — are gone,
along with the `@credda/js` dependency they ran on.

Credda is now a system that investigates defects and vulnerabilities in a
customer's production and QA environments. Its CLI is published to npm as the
**unscoped `credda` package**, and that package owns the `credda` executable.

### Why the executable was removed rather than replaced

Both packages installed a binary called `credda`. On a machine with both, the
one installed second wins and the other silently stops working. This package
gives the name up: `@credda/cli` 1.0.0 declares no `bin` at all.

### What this package is now

The public source mirror and issue tracker for the `credda` CLI's command
surface — the role this repository's README already claimed. It exports the
command table and argument parser, copied byte for byte from the engine
repository, so tooling can ask offline what `credda` accepts. It runs nothing.

### Migration

| You were doing | Do this now |
| --- | --- |
| `npm i -g @credda/cli` for the `credda` binary | `npm i -g credda` — a different product; read its README first |
| Using the trust-score commands | Nothing here replaces them. Pin `@credda/cli@0.1.6`; it is unchanged and still installable. |
| Importing from `@credda/cli` | There was no supported import surface before 1.0.0. There is one now: `import { COMMANDS } from '@credda/cli'`. |

Nothing has been unpublished. `0.1.6` remains on the registry exactly as it was.

### The command surface gained `credda cancel`, and a seventh exit code

Mirrored from the engine on 2026-08-29. `credda cancel <id>` stops a run started
in another terminal on the same machine, and it reports what stopping actually
achieved rather than reporting success either way.

The two answers are kept apart in the exit code because they are two different
claims about the reader's own machine and their own bill:

| Code | Claim |
| --- | --- |
| `0` | Nothing is running. The run had not started, its process is gone, or it was already cancelled. |
| `7` | `CANCELLATION_REQUESTED`. A process is **still inside the run**, holding a sandbox and possibly a model call. It was signalled and it stops at its next checkpoint, writing its own terminal state. |
| `2` | It already finished, or it is executing somewhere unreachable — in which case nothing was written to it. |

`7` is new and is not a renumbering: `0` through `6` mean exactly what they meant
in 1.0.0. It is separate from `4`, which is `credda investigate` reporting that a
run it was executing ended; `7` is a different process reporting that it asked
one to, without knowing whether it did.

The statuses are the ones `POST /api/investigations/:id/cancel` returns, spelled
identically.

Also mirrored: `credda validations` and `credda validation <id>`, which were
copied into `src/commands.ts` before this changelog recorded them, and are now
listed in the README's command table.
