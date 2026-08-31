# Security

## Reporting a vulnerability

Use **GitHub's private vulnerability reporting** on this repository: the
Security tab, then "Report a vulnerability". That opens a private advisory
visible to the maintainers and to you, and nowhere else.

Please do not open a public issue for something exploitable, and please do not
wait for us to be ready before you tell us.

What helps, in rough order:

- what an attacker gets, stated first
- the smallest input that demonstrates it
- the version or commit you were on

If you would rather not use GitHub, [credda.io](https://credda.io) has the
contact details.

## What this package is, and therefore what its attack surface is

**This package installs no command.** `1.0.0` declares no `bin`, so nothing here
runs on anybody's machine after an install. It is a library and a published
description of a command surface that lives elsewhere.

That makes the honest statement about scope an awkward one, and it is worth
making rather than implying:

- **A vulnerability in the `credda` command is not a vulnerability in this
  repository**, but it is still ours and we still want it. Report it here, or
  privately on whichever Credda repository you were actually using; it will be
  routed. Do not sit on it because you could not work out which tracker.
- **`src/args.ts` and `src/commands.ts` are byte-identical copies** of the
  engine CLI's own files, and `.github/workflows/ci.yml` proves it on every run.
  A parsing flaw found by reading them is a flaw in the engine, and reporting it
  here reaches the same maintainer.

Anything published under this name at **0.1.6 and earlier** is a different
product — a reliability-score client — and it *did* install a `credda` binary.
It is untouched on the registry and nothing has been unpublished. It receives no
fixes. If you are running it, you are running retired software by choice.

## Supported versions

The latest published minor. `1.0.0` is not published yet and the registry still
serves `0.1.6`; fixes go to `main` and to a new release rather than to a branch.
