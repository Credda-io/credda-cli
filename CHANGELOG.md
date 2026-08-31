# Changelog

## Unreleased

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

## 1.0.0 — BREAKING: this package no longer installs a `credda` command

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
