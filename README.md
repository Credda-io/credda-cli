<p align="center">
  <a href="https://credda.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Credda-io/credda-cli/main/assets/creddalockuplongdarktransparent.png">
      <img alt="Credda" src="https://raw.githubusercontent.com/Credda-io/credda-cli/main/assets/creddalockuplonglighttransparent.png" width="360">
    </picture>
  </a>
</p>

> Source mirror for [`@credda/cli`](https://www.npmjs.com/package/@credda/cli). Install from npm: `npm install -g @credda/cli`. Canonical development happens in Credda internal tooling; this repo is for source and issues.

# @credda/cli

The official Credda CLI: portable trust from the terminal. A thin client over
[`@credda/js`](https://www.npmjs.com/package/@credda/js)'s headless export;
**no scoring logic lives here** (the deterministic score is computed only by
the API's `score.service`).

## Install

```sh
npm install -g @credda/cli   # or: pnpm add -g @credda/cli
credda help
```

Node 20 or newer. Nothing else to configure for the public commands below.

Prefer not to install globally? `npx @credda/cli help` works the same way.

`credda help` always lists exactly what the version you installed can do, so
treat it, not this file, as the authority on your copy. `credda --version`
prints that version.

## Commands

Start here, if you hold a sandbox key (`CREDDA_API_KEY` of the `crd_test_`
kind; a live key is refused before anything happens):

```sh
credda quickstart           # seed the sandbox with synthetic subjects, print
                            #   their real scores, then close the counterparty-
                            #   confirmation loop so you finish holding a real
                            #   VERIFIED event rather than a number you read
             --no-confirm   # stop after the seed; skip the confirmation loop
```

Public (no API key):

```sh
credda lookup <token>       # trust check for a share token (GET /verify/:token)
credda export <token>       # full self-verifying trust export bundle
credda verify <file|->      # OFFLINE-verify a credential someone handed you:
                            #   a W3C VC-JWT, a compact Trust Credential, or a
                            #   saved trust-export bundle (auto-detected).
                            #   '-' reads stdin. Exit 0 valid / 2 invalid.
credda registry             # federated trust registry (/.well-known)
credda did                  # issuer DID document
credda benchmarks           # cohort-benchmark catalog: the dimensions you can
                            #   benchmark on and the k-anonymity floor below
                            #   which no cohort is disclosed
credda reason-codes         # adverse-action reason-code catalog (ECOA / Reg B).
                            #   Credda supplies the attribution only: it is not
                            #   a creditor and issues no notice.
credda badges list          # the closed set of Open Badges 3.0 achievements
credda badges get <badgeId> #   this issuer will sign, and one definition
credda outcome-templates [industry]
                            # how a business maps its work to Credda events, and
                            #   WHO confirms each outcome. Guidance only.
credda professional-record public <token>
                            # the professional record behind a share token
                            #   (the token IS the subject's consent to present it)
credda career-export --token <token>
                            # the whole verified record as a JSON Resume document,
                            #   behind a share token (no API key sent)
```

Platform (set `CREDDA_API_KEY`, a `crd_live_…` platform key):

```sh
credda score <userId>       # current score
credda explain <userId>     # factor-level explanation
credda components <userId>  # six named 0-100 components
credda risk <userId>        # advisory risk signals
credda trust-summary <userId> [--narrative]
                            # deterministic, evidence-based summary + strengths
                            #   + risks. It explains; it is never a verdict.
                            #   --narrative adds an advisory AI retelling.
credda benchmark <userId> [--dimension <d>]
                            # where the subject sits in its cohort: percentile
                            #   + the cohort distribution. `available:false`
                            #   when the cohort is below the k-anonymity floor
                            #   (insufficient_data) or the subject has no score
                            #   yet (no_score).
credda distribution [--dimension <d>] [--cohort <c>]
                            # aggregate, k-anonymised cohort distribution.
                            #   Omit --cohort for every cohort on the dimension.
credda users [--score-min <n>] [--score-max <n>] [--band <b>]
             [--subject-type <PERSON|AGENT|ORGANIZATION>]
             [--scored|--unscored] [--frozen]
             [--active-since <iso>] [--registered-since <iso>]
             [--registered-before <iso>] [--verified] [--min-verified <n>]
             [--sort <score|lastActivity|registered|externalId>]
             [--order <asc|desc>] [--cursor <c>] [--limit <n>]
                            # query + export your book of subjects. The filter
                            #   set is closed and validated: no query DSL.
                            #   A subject with no score yet reports null, never
                            #   a placeholder; list those with --unscored.
credda book-summary [same filters as "users"]
                            # size a segment WITHOUT paging it: how many match,
                            #   how many are scored, band mix, median/mean.
                            #   Null (not 0) when nothing in it is scored.
credda usage [days]         # your platform's metered usage (trailing window)
credda usage --from 2026-06-01 --to 2026-06-30
                            # explicit statement range (mutually exclusive
                            # with [days])
credda usage --csv usage.csv
                            # write the flat CSV statement to a file
                            # (raw ?format=csv fetch; combines with either window)
credda activity [--action <A>] [--from <t>] [--to <t>] [--cursor <c>] [--limit <n>]
                            # your platform's own activity/audit log,
                            # newest-first, cursor-paginated
credda verified-profile <userId>
                            # how much of a subject's CLAIMED record
                            #   (education/skills/certifications/employment) is
                            #   third-party verified. Counts WHETHER a claim is
                            #   verified, never how prestigious it is, and can
                            #   never move the Reliability Score.
credda qualify <userId> --category <education|skill|certification|employment>
        [--label <l>] [--issuer <i>] [--verified-by <witness>]
                            # record a qualification claim. Always recorded;
                            #   counts as VERIFIED only with a genuine
                            #   third-party --verified-by witness.
credda professional-record get <userId>
                            # résumé-shaped summary of a VERIFIED work record.
                            #   Describes a record. Not a hiring verdict, a
                            #   background check, or a consumer report.
credda professional-record credential <userId> [--ttl <seconds>]
                            # mint the signed, offline-verifiable credential
                            #   (+ an "Add to LinkedIn" certification link)
credda reliability-report <userId> [--recent <n>] [--benchmark]
                            # the consolidated worker reliability report a
                            #   staffing agency or employer weighs. EVIDENCE, not
                            #   a hire / place / rank verdict or a consumer report.
                            #   Use --token <token> for the public worker-consent
                            #   route (NO API key).
credda career-export <userId>
                            # the whole verified record as an open JSON Resume
                            #   document. Use --token <token> for the public route.
credda mint <userId>        # mint a share token
credda revoke <userId>      # revoke a share token
```

Confirmation requests: the counterparty-confirmation primitive. You propose an
outcome and deliver the one-time token yourself; the event is written, verified,
only when that distinct party confirms:

```sh
credda confirmations create --user worker_7 --type CONTRACT_FULFILLED \
        --counterparty client_42 --counterparty-name "Acme Ltd" \
        --description "Kitchen refit" [--stake HIGH] [--value 1200] \
        [--due <iso>] [--completed <iso>] [--return-url <url>] \
        [--expires-in 14] [--idempotency-key <k>]
                            # needs CREDDA_API_KEY. The token is shown ONCE;
                            #   creating a request writes no event.
credda confirmations batch <file.json> [--idempotency-key <k>]
                            # the ACTIVATION ENGINE: bulk-create up to 100
                            #   requests from a JSON file (an array of request
                            #   bodies, or { "requests": [...] }), warming a cold
                            #   ledger from your book. Needs CREDDA_API_KEY; each
                            #   ok item's token is shown ONCE.
credda confirmations list [--status PENDING] [--cursor <c>] [--limit <n>]
credda confirmations get <id>
credda confirmations cancel <id>          # only while PENDING

# ⚠️ These two are the COUNTERPARTY's calls and take NO API key (they hold a
# token, not a Credda account):
credda confirmations preview <id> --token <t>
credda confirmations respond <id> --token <t> --confirm
credda confirmations respond <id> --token <t> --decline
                            # --confirm writes the verified event; --decline
                            #   writes nothing. Single-use either way, and
                            #   there is no default: you must say which.
```

Reference requests: the qualifications-half sibling of confirmations. A résumé
claim (employment / education / certification / skill) becomes verified when the
named third party who was there confirms it; a reference never moves the score:

```sh
credda references create --user worker_7 --category employment \
        --counterparty manager_42 --label "Senior Engineer" \
        --issuer "Acme Ltd" [--jurisdiction US-CA] [--reference EMP-9910] \
        [--counterparty-name "Dana Lee"] [--description <d>] \
        [--return-url <url>] [--expires-in 14] [--idempotency-key <k>]
                            # needs CREDDA_API_KEY. The token is shown ONCE;
                            #   creating a request records no qualification.
credda references list [--status PENDING] [--cursor <c>] [--limit <n>]
credda references get <id>
credda references cancel <id>             # only while PENDING

# ⚠️ These two are the REFERENCE's calls and take NO API key (they hold a
# token, not a Credda account):
credda references preview <id> --token <t>
credda references respond <id> --token <t> --confirm
credda references respond <id> --token <t> --decline
                            # --confirm records the verified qualification;
                            #   --decline writes nothing. Single-use either way,
                            #   and there is no default: you must say which.
```

Threshold policies: declarative "tell me when this line is crossed", delivered
as `policy.threshold_crossed` through your webhooks. Config only: a policy never
reads into, blocks, or changes a score:

```sh
credda policies create --name "Watch 60" --user worker_7 \
        --metric score --direction down --threshold 60
credda policies create --name "Anyone entering At Risk" --all \
        --metric band --direction enter --band "At Risk"
credda policies list [--cursor <c>] [--limit <n>]
credda policies get <id>
credda policies update <id> [--threshold <n>] [--direction <d>] [--band <b>]
        [--component <c>] [--name <n>] [--activate | --deactivate]
                            # the metric is immutable: delete and recreate
credda policies delete <id>
```

Score monitors (set `CREDDA_API_KEY`). Edge-triggered threshold/band watches
that deliver `monitor.triggered` through your subscribed webhooks;
notification config only (a monitor never affects a score):

```sh
credda monitors list [--cursor <c>] [--limit <n>]
credda monitors get <id>
credda monitors create --user <externalId> --below 40
                            # at least one condition required:
                            #   --below <score>   downward crossing (also fires
                            #                     on a FIRST score already below)
                            #   --above <score>   upward crossing
                            #   --band-change     any band change
credda monitors delete <id>
```

Bulk screenings (set `CREDDA_API_KEY`). Async batch score reads (up to
10,000 ids per job), strictly read-only:

```sh
credda screen u1,u2 u3      # ids inline, comma/space separated
credda screen --file roster.csv
                            # one id per line, or a CSV whose FIRST column is
                            # the id (a leading id/userId/externalId header
                            # row is skipped; no quoted-CSV handling)
credda screen u1,u2 --wait  # poll until the job finishes, print the summary
                            # (exit 1 if the job FAILED)
credda screenings list [--cursor <c>] [--limit <n>]
credda screenings get <id>  # job status + summary
credda screenings results <id>            # per-user results as JSON
credda screenings results <id> --csv out.csv
                            # write the CSV attachment instead (raw fetch)
```

Webhooks (set `CREDDA_API_KEY`):

```sh
credda webhooks list
credda webhooks create https://hooks.you/credda score.updated score.band_changed
                            # signing secret shown ONCE
credda webhooks delete <id>
credda webhooks test <id>   # synthetic signed delivery
credda webhooks deliveries <id>   # recent attempts, incl. retries
```

Local development:

```sh
CREDDA_WEBHOOK_SECRET=whsec_... credda listen 4141
```

`credda listen` runs a local receiver that HMAC-verifies each delivery (the
same check your production handler must do) and pretty-prints the payload.
Credda delivers to public HTTPS only, so expose the port with your own tunnel
(e.g. `cloudflared tunnel --url http://localhost:4141`) and register the
tunnel URL as the webhook: the Stripe-CLI-style local loop without Credda
running a tunneling service.

Environment: `CREDDA_API_URL` overrides the API base (default
`https://api.credda.io`); `CREDDA_WEBHOOK_SECRET` enables signature
verification in `credda listen`.

## Design

- `src/cli.ts` is the pure command router: no `process`, `fs`, or env access,
  so the whole surface is unit-tested with a mocked `CreddaClient` (same
  pattern as `packages/mcp`'s `tools.ts`).
- `src/index.ts` only wires the real environment (env vars, stdin/file
  reading, exit codes).
- `verify` uses the SDK's offline verifiers (WebCrypto Ed25519 + StatusList
  revocation). The point is that a received credential can be checked
  without trusting the wire it arrived on.
- Every command is read-only against the score. `mint`/`revoke` manage a
  share token (a capability, not a score write).

## License

MIT © Credda. See [LICENSE](LICENSE).

---

Part of the Credda SDK family:
[`@credda/js`](https://github.com/Credda-io/credda-js) ·
[`credda-go`](https://github.com/Credda-io/credda-go) ·
[`@credda/cli`](https://github.com/Credda-io/credda-cli) ·
[`@credda/mcp-server`](https://github.com/Credda-io/credda-mcp)
