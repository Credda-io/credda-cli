<!--
Read this first, because two files in this repository cannot be changed here at
all and it is better to know before than after.

`src/args.ts` and `src/commands.ts` ARE COPIES. They are byte-identical to
`apps/cli/src/args.ts` and `apps/cli/src/commands.ts` in the engine repository,
and the `surface-parity` job in .github/workflows/ci.yml compares them with
`cmp` on every run. That check is the only thing that makes the documented
command surface trustworthy, so a pull request editing either file turns it red
by design. The change has to be made upstream and mirrored; it cannot start
here. If you have found something wrong in one of them, an issue is the right
move and the fix will come back down.

Note also that `surface-parity` FAILS rather than skips when the
MONOREPO_READ_TOKEN secret is unavailable, which it is on a pull request from a
fork. That red is not yours and it is not something you can fix from a fork —
say so in the description and it will be read correctly.

Everything else in this repository is ordinary and welcome: the README, the
changelog, the mirror's own tests, a type that is wrong.
-->

**What is wrong today.** <!-- The behaviour, not the change. -->

**What this changes.**

**How you know it works.** <!-- Name the test. `npm run typecheck && npm test`. -->

- [ ] `npm run typecheck` and `npm test` pass.
- [ ] This does not edit `src/args.ts` or `src/commands.ts`. <!-- If it must, the upstream change has to land first. -->
- [ ] If a mirrored file was added or removed, `MIRRORED_FILES` in `src/index.ts` and the `surface-parity` job were updated together.
- [ ] Comments added here explain *why*, not *what*.
