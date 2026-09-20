# Releasing `@credda/cli`

## Status — checked 2026-09-20

Steps 2 and 3 below have already happened; this file is kept for the reasoning
and for the next release, not as a to-do list.

- **1.0.0 is published.** `npm view @credda/cli dist-tags` prints
  `latest: 1.0.0`, published 2026-09-08. It declares no `bin`, as intended.
- **`credda` is published**, at 1.1.0 on 2026-09-07, from `Credda-io/core` at
  `apps/cli`. It owns the executable name.
- **0.x is deprecated, but not with the message below.** Every `0.1.x` carries
  npm's generic `"Package no longer supported. Contact Support at
  https://www.npmjs.com/support for more info."` — not the message this file
  specifies, which is the one that tells a user the product is retired and which
  version to pin. Re-running the `npm deprecate` command below would replace it.
  **That is a registry write and a human decision; it has not been run here.**

## The deprecation of 0.x — run this, and know why

```bash
npm deprecate @credda/cli@"<1.0.0" "Credda's reliability-score API is being retired and 0.x is its client. This package is being redefined for Credda's bug-and-vulnerability engine. Pin @credda/cli@0.1.6 to stay on 0.x."
```

**Why the message does not say "upgrade to 1.0.0".** It is written to be true
whether or not 1.0.0 exists yet. A deprecation notice that points at a version
nobody can install is worse than none: it reads as a broken release rather than
a retirement, and it is the first thing a user sees on an install that still
works fine.

**Deprecation is reversible.** `npm deprecate @credda/cli@"<1.0.0" ""` clears it.
That is the one thing in this file that can be undone; publishing cannot.

**What it does not do.** It unpublishes nothing. Every 0.x version stays on the
registry forever and every existing lockfile keeps resolving. A pinned build
does not break — it prints a warning. That is the point: the API behind 0.x is
what will stop answering, and the warning is the only notice a pinned consumer
will get before it does.

## Order

1. Merge `pivot/credda` to the default branch.
2. `npm deprecate` as above. Safe at any time, and honest today: the product
   0.x speaks to is retired regardless of when 1.0.0 ships.
3. Publish 1.0.0 only after a human has read `CHANGELOG.md` and agreed that
   redefining a live name is the right call rather than taking a fresh one.
   1.0.0 no longer ships a binary; the engine CLI owns the `credda` command.

## Authentication

These commands need an npm account with publish rights on the `@credda` scope.
Run `npm login` first; `npm whoami` should print your username.
