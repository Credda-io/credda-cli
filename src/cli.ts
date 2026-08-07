/**
 * Command router — pure of process/env/fs so it's testable with a mocked
 * context (same pattern as packages/mcp's tools.ts).
 *
 * Every command is READ-ONLY against Credda's deterministic score. Nothing
 * here writes an Event, adjusts a score, or makes a trust decision — the CLI
 * looks up and offline-verifies EXISTING, already-computed trust facts.
 * `mint`/`revoke` manage a share token (a capability, not a score write).
 */

import type {
  CreddaClient,
  VerifiedCredential,
  VerifiedVc,
  VerifiedTrustExport,
  TrustExport,
  IngestEventType,
  ConfirmationStatus,
  ReferenceRequestStatus,
  ReferenceCategory,
  QualificationCategory,
  PolicyMetric,
  PolicyDirection,
  PolicyComponentKey,
  BookFilterQuery,
} from '@credda/js/headless';

export interface CliContext {
  client: CreddaClient;
  /** Platform API key from CREDDA_API_KEY — only needed for keyed commands. */
  apiKey?: string;
  out: (line: string) => void;
  err: (line: string) => void;
  readInput: (pathOrDash: string) => Promise<string>;
  /** Injected so tests can mock offline verification. */
  verifiers: {
    trustCredential: (credential: string) => Promise<VerifiedCredential>;
    verifiableCredential: (vcJwt: string) => Promise<VerifiedVc>;
    trustExport: (bundle: TrustExport) => Promise<VerifiedTrustExport>;
  };
  /** whsec_… signing secret from CREDDA_WEBHOOK_SECRET — used by `listen`. */
  webhookSecret?: string;
  /**
   * Starts the local webhook receiver (`credda listen`). Injected so the pure
   * router stays free of node:http; resolves when the server has stopped.
   */
  startListener?: (opts: { port: number; secret?: string }) => Promise<void>;
  /**
   * Raw authenticated GET returning the response body as text — for the CSV
   * endpoints (`?format=csv`), which the typed SDK deliberately leaves to raw
   * fetch. `path` is relative to the `/api/v1` prefix.
   */
  fetchCsv?: (path: string, apiKey: string) => Promise<string>;
  /** Write a file to disk (CSV outputs). Injected so the router stays fs-free. */
  writeFile?: (path: string, content: string) => Promise<void>;
  /** Sleep between `screen --wait` polls. Injected so tests don't wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Poll interval for `screen --wait` (default 2000ms). */
  pollIntervalMs?: number;
}

export const VERSION = '0.1.3';

export const HELP = `credda: portable trust from the terminal

Start here (needs a sandbox CREDDA_API_KEY, the crd_test_ kind):
  credda quickstart              Seed your sandbox with synthetic subjects, print
                                 their real scores, read one back, and then close
                                 the counterparty-confirmation loop end to end so
                                 you finish holding a real VERIFIED event, not
                                 just a number you read. One command, nothing
                                 written outside the sandbox.
       --no-confirm              Stop after the seed; skip the confirmation loop.

Sandbox (crd_test_ keys only; a live key is refused before anything happens):
  credda sandbox seed            Populate the sandbox with synthetic subjects.
                                 Idempotent: an already-seeded subject is left
                                 alone, never doubled.
  credda sandbox reset           Wipe the sandbox and start over.

Public (no API key):
  credda lookup <token>          Trust check for a share token
  credda export <token>          Full self-verifying trust export bundle
  credda verify <file|->         Offline-verify a credential: a W3C VC-JWT,
                                 a compact Trust Credential, or a saved trust
                                 export bundle (auto-detected). '-' = stdin.
  credda registry                Federated trust registry
  credda did                     Issuer DID document
  credda benchmarks              Cohort-benchmark catalog (dimensions + k-anonymity)
  credda reason-codes            Adverse-action reason-code catalog (ECOA / Reg B)
  credda outcome-templates [industry]
                                 How a real-world business maps its work to
                                 Credda events, and WHO confirms each outcome.
                                 Guidance only. Optional industry slug filters.
  credda badges list             Open Badges 3.0 achievements this issuer signs
  credda badges get <badgeId>    One achievement definition
  credda professional-record public <token>
                                 The professional record behind a share token
                                 (the subject's own consent to present it)
  credda career-export --token <token>
                                 The subject's whole verified record as a JSON
                                 Resume document, behind a share token (the
                                 subject's own consent, no API key sent)

Platform (needs CREDDA_API_KEY):
  credda score <userId>          Current score
  credda explain <userId>        Factor-level score explanation
  credda components <userId>     Six named 0-100 score components
  credda risk <userId>           Advisory risk signals
  credda trust-summary <userId> [--narrative]
                                 Deterministic, evidence-based trust summary
                                 (explains; never a verdict). --narrative adds an
                                 advisory AI retelling when the server has AI on.
  credda benchmark <userId> [--dimension <d>]
                                 Where a subject sits within its cohort:
                                 percentile + the cohort distribution
  credda distribution [--dimension <d>] [--cohort <c>]
                                 Aggregate, k-anonymised cohort distribution.
                                 Omit --cohort for every cohort on the dimension.
  credda users [--score-min <n>] [--score-max <n>] [--band <b>]
        [--subject-type <PERSON|AGENT|ORGANIZATION>] [--scored|--unscored] [--frozen]
        [--active-since <iso>] [--registered-since <iso>] [--registered-before <iso>]
        [--verified] [--min-verified <n>]
        [--sort <score|lastActivity|registered|externalId>] [--order <asc|desc>]
        [--cursor <c>] [--limit <n>]
                                 Query + export your book of subjects.
                                 A subject with no score yet reports null,
                                 never a placeholder; list those with
                                 --unscored.
  credda book-summary [same filters as "users"]
                                 Size a segment WITHOUT paging it: how many
                                 match, how many are scored, band mix and
                                 median/mean. Null (not 0) when nothing in the
                                 segment is scored.
  credda usage [days] [--from <date> --to <date>] [--csv <outfile>]
                                 Your platform's metered API usage. Either a
                                 trailing [days] window OR an inclusive
                                 --from/--to date range (YYYY-MM-DD), not both.
                                 --csv writes the flat CSV statement to a file.
  credda activity [--action <A>] [--from <t> --to <t>] [--cursor <c>] [--limit <n>]
                                 Your platform's own activity/audit log,
                                 newest-first, cursor-paginated
  credda verified-profile <userId>
                                 How much of a subject's CLAIMED record
                                 (education/skills/certifications/employment) is
                                 third-party verified. Counts whether a claim is
                                 verified, never how prestigious it is, and it
                                 can never move the Reliability Score.
  credda qualify <userId> --category <education|skill|certification|employment>
        [--label <l>] [--issuer <i>] [--verified-by <witness>]
                                 Record a qualification claim. Always recorded;
                                 counts as VERIFIED only with a genuine
                                 third-party --verified-by witness.
  credda professional-record get <userId>
                                 Résumé-shaped summary of a VERIFIED work record.
                                 Describes a record, not a hiring verdict, a
                                 background check, or a consumer report.
  credda professional-record credential <userId> [--ttl <seconds>]
                                 Mint the signed, offline-verifiable Professional
                                 Record Credential (+ an "Add to LinkedIn" link)
  credda reliability-report <userId> [--recent <n>] [--benchmark]
                                 The consolidated worker reliability report a
                                 staffing agency or employer weighs: reliability,
                                 metrics, verified experience, tenure, ranked
                                 drivers, recent outcomes. EVIDENCE, not a hire /
                                 place / rank verdict, a background check, or a
                                 consumer report. Use --token <token> for the
                                 public worker-consent route (NO API key).
  credda career-export <userId>  The subject's whole verified record as an open
                                 JSON Resume document (jsonresume.org). Describes
                                 a record, not a hiring verdict or a consumer
                                 report. Use --token <token> for the public route.
  credda mint <userId>           Mint a share token for a user
  credda revoke <userId>         Revoke a user's share token

Confirmation requests: the counterparty-confirmation primitive. You PROPOSE an
outcome and deliver the one-time token to the counterparty over YOUR OWN channel;
the event is written, verified, only when that distinct party confirms:
  credda confirmations create --user <externalId> --type <eventType>
        --counterparty <ref> [--counterparty-name <n>] [--description <d>]
        [--stake <HIGH|MEDIUM|LOW>] [--value <n>] [--due <iso>] [--completed <iso>]
        [--return-url <url>] [--expires-in <days>] [--idempotency-key <k>]
                                 Needs CREDDA_API_KEY. Token shown ONCE.
  credda confirmations batch <file.json> [--idempotency-key <k>]
                                 The ACTIVATION ENGINE: bulk-create up to 100
                                 requests from a JSON file (an array of request
                                 bodies, or { "requests": [...] }). Warms a cold
                                 ledger from your book. Needs CREDDA_API_KEY;
                                 each ok item's token is shown ONCE.
  credda confirmations list [--status <s>] [--cursor <c>] [--limit <n>]
  credda confirmations get <id>
  credda confirmations cancel <id>
  credda confirmations preview <id> --token <t>
                                 What the counterparty is asked to confirm.
                                 NO API key; the token is the capability.
  credda confirmations respond <id> --token <t> (--confirm | --decline)
                                 The counterparty's decision. NO API key.
                                 --confirm writes the event; --decline writes
                                 nothing. Single-use either way.

Reference requests: the qualifications-half sibling of confirmations. A résumé
claim (employment / education / certification / skill) becomes VERIFIED when the
named third party who was there confirms it. Records no qualification and never
moves the reliability score:
  credda references create --user <externalId>
        --category <employment|education|certification|skill>
        --counterparty <ref> [--label <l>] [--issuer <i>] [--jurisdiction <j>]
        [--reference <r>] [--counterparty-name <n>] [--description <d>]
        [--return-url <url>] [--expires-in <days>] [--idempotency-key <k>]
                                 Needs CREDDA_API_KEY. Token shown ONCE.
  credda references list [--status <s>] [--cursor <c>] [--limit <n>]
  credda references get <id>
  credda references cancel <id>
  credda references preview <id> --token <t>
                                 What the reference is asked to confirm.
                                 NO API key; the token is the capability.
  credda references respond <id> --token <t> (--confirm | --decline)
                                 The reference's decision. NO API key.
                                 --confirm records the qualification; --decline
                                 writes nothing. Single-use either way.

Threshold policies (needs CREDDA_API_KEY): declarative "tell me when this line
is crossed"; delivers policy.threshold_crossed through your webhooks. Config
only: a policy never reads into, blocks, or changes a score:
  credda policies list [--cursor <c>] [--limit <n>]
  credda policies get <id>
  credda policies create --name <n> (--user <externalId> | --all)
        --metric <score|component|band|verified_events>
        [--direction <up|down|enter|leave>] [--threshold <n>]
        [--component <reliability|timeliness|trustworthiness|verification|consistency|momentum>]
        [--band <b>]
  credda policies update <id> [--name <n>] [--direction <d>] [--threshold <n>]
        [--component <c>] [--band <b>] [--activate | --deactivate]
                                 The metric is immutable; delete + recreate.
  credda policies delete <id>

Score monitors (needs CREDDA_API_KEY): edge-triggered watches that deliver
"monitor.triggered" through your webhooks; notification config only, a
monitor never affects a score:
  credda monitors list [--cursor <c>] [--limit <n>]
  credda monitors get <id>
  credda monitors create --user <externalId> [--below <score>] [--above <score>] [--band-change]
                                 At least one condition required. --below fires
                                 on a downward crossing (and on a first score
                                 already below it), --above on an upward
                                 crossing, --band-change on any band change.
  credda monitors delete <id>

Bulk screenings (needs CREDDA_API_KEY): async batch score reads, up to
10,000 ids per job, strictly read-only:
  credda screen <ids...>         Submit ids (comma/space separated), or:
  credda screen --file <path>    One id per line, or a CSV whose FIRST column
                                 is the id (a leading "id"/"userId"/
                                 "externalId" header row is skipped).
         [--wait]                Poll until the job finishes, then print the
                                 summary (exit 1 if the job FAILED).
  credda screenings list [--cursor <c>] [--limit <n>]
  credda screenings get <id>     Job status + summary
  credda screenings results <id> [--csv <outfile>]
                                 Per-user results (JSON; --csv writes the CSV
                                 attachment to a file instead)

Webhooks (needs CREDDA_API_KEY):
  credda webhooks list                     Your webhook subscriptions
  credda webhooks create <url> <event..>   Subscribe (secret shown ONCE)
  credda webhooks delete <id>              Remove a webhook
  credda webhooks test <id>                Send a synthetic signed delivery
  credda webhooks deliveries <id>          Recent delivery attempts (incl. retries)
  credda webhooks recent [event..]         Recent events across ALL your endpoints
                                           (sample data for automation platforms;
                                           falls back to catalog examples, flagged
                                           isExample, when nothing has fired yet)

Local development:
  credda listen [port]           Local webhook receiver: verifies each delivery's
                                 HMAC signature (CREDDA_WEBHOOK_SECRET) and
                                 pretty-prints the payload. Default port 4141.
                                 Credda delivers to public HTTPS only; expose
                                 this port with your own tunnel (e.g. cloudflared).

Environment:
  CREDDA_API_URL                 API base (default https://api.credda.io)
  CREDDA_API_KEY                 Platform API key for keyed commands
  CREDDA_WEBHOOK_SECRET          whsec_… signing secret for "credda listen"

Exit codes: 0 ok/valid · 1 error · 2 credential failed verification`;

function requireKey(ctx: CliContext): string {
  if (!ctx.apiKey) {
    throw new Error('this command needs CREDDA_API_KEY set (a platform API key)');
  }
  return ctx.apiKey;
}

/** Raw-key prefix the API stamps on a sandbox key (lib/testMode.ts). */
export const TEST_KEY_PREFIX = 'crd_test_';

/**
 * A sandbox key, or an error that says exactly what to do next.
 *
 * The server refuses a live key anyway (`403 TEST_MODE_ONLY`), but a first-run
 * user does not deserve a 403 to interpret — the prefix is visible locally, so
 * the actionable message costs one string comparison. This is the "better
 * first-run errors" rule applied to the single most likely first mistake.
 */
export function requireSandboxKey(ctx: CliContext): string {
  const key = requireKey(ctx);
  if (!key.startsWith(TEST_KEY_PREFIX)) {
    throw new Error(
      `this command only runs against a SANDBOX key, and CREDDA_API_KEY looks like a live key.\n` +
        `  Create one at https://api.credda.io/console (the "Sandbox key" button, free on every plan,\n` +
        `  and it does not consume a production key slot), then:\n` +
        `    export CREDDA_API_KEY=${TEST_KEY_PREFIX}…`,
    );
  }
  return key;
}

/** Right-pad for the quickstart table. Pure so the router stays testable. */
function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

function requireArg(args: string[], name: string): string {
  const v = args[0];
  if (!v) throw new Error(`missing required argument <${name}>. See "credda help"`);
  return v;
}

function show(ctx: CliContext, value: unknown): void {
  ctx.out(JSON.stringify(value, null, 2));
}

/**
 * Extra stderr lines for a failed command.
 *
 * The important one is the **request id**: it is the single fastest way for
 * Credda to diagnose a failure, and a CLI user has nowhere else to find it.
 * Also surfaces the machine code (so it can be looked up in
 * `GET /api/v1/errors`) and any `Retry-After` the server asked for.
 *
 * Duck-typed rather than `instanceof CreddaError` on purpose — the router
 * imports only TYPES from the SDK, so it stays pure and trivially mockable.
 * Pure and exported for testing.
 */
export function errorHints(e: unknown): string[] {
  if (!e || typeof e !== 'object') return [];
  const err = e as { requestId?: unknown; code?: unknown; retryAfterMs?: unknown };
  const lines: string[] = [];
  if (typeof err.code === 'string' && err.code) {
    lines.push(`  code:      ${err.code}  (see https://api.credda.io/api/v1/errors)`);
  }
  if (typeof err.requestId === 'string' && err.requestId) {
    lines.push(`  requestId: ${err.requestId}  (quote this to support)`);
  }
  if (typeof err.retryAfterMs === 'number' && err.retryAfterMs > 0) {
    lines.push(`  retry in:  ${Math.ceil(err.retryAfterMs / 1000)}s`);
  }
  return lines;
}

/**
 * Tiny flag parser: `--name value` for valued flags, bare `--name` for
 * booleans, everything else positional. Unknown `--flags` are an error rather
 * than silently becoming positionals.
 */
export function parseFlags(
  args: string[],
  spec: { valued?: string[]; boolean?: string[] } = {},
): { positional: string[]; flags: Record<string, string | true> } {
  const valued = new Set(spec.valued ?? []);
  const bools = new Set(spec.boolean ?? []);
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const name = a.slice(2);
      if (bools.has(name)) {
        flags[name] = true;
      } else if (valued.has(name)) {
        const v = args[++i];
        if (v === undefined) throw new Error(`--${name} needs a value. See "credda help"`);
        flags[name] = v;
      } else {
        throw new Error(`unknown flag --${name}. See "credda help"`);
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function numFlag(flags: Record<string, string | true>, name: string): number | undefined {
  const v = flags[name];
  if (v === undefined) return undefined;
  const n = Number(v);
  if (typeof v !== 'string' || v === '' || !Number.isFinite(n)) {
    throw new Error(`--${name} must be a number`);
  }
  return n;
}

function intFlag(flags: Record<string, string | true>, name: string): number | undefined {
  const n = numFlag(flags, name);
  if (n !== undefined && (!Number.isInteger(n) || n < 1)) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return n;
}

function strFlag(flags: Record<string, string | true>, name: string): string | undefined {
  const v = flags[name];
  return typeof v === 'string' ? v : undefined;
}

/** `--cursor` / `--limit` shared by the paginated list commands. */
function pageQuery(flags: Record<string, string | true>): { limit?: number; cursor?: string } {
  return { limit: intFlag(flags, 'limit'), cursor: strFlag(flags, 'cursor') };
}

/**
 * The CLOSED book filter set, shared by `credda users` and
 * `credda book-summary` so the two can never offer different filters.
 *
 * `--scored` / `--unscored` are surfaced as two opposing switches rather than a
 * `--has-score=true|false` value because that reads better at a prompt; passing
 * both is a contradiction and is refused rather than silently resolved.
 */
function bookFilterFlags(flags: Record<string, string | true>): BookFilterQuery {
  if (flags.scored === true && flags.unscored === true) {
    throw new Error('--scored and --unscored are opposites; pass at most one');
  }
  const query: BookFilterQuery = {
    scoreMin: numFlag(flags, 'score-min'),
    scoreMax: numFlag(flags, 'score-max'),
    band: strFlag(flags, 'band'),
    subjectType: strFlag(flags, 'subject-type') as BookFilterQuery['subjectType'],
    activeSince: strFlag(flags, 'active-since'),
    registeredSince: strFlag(flags, 'registered-since'),
    registeredBefore: strFlag(flags, 'registered-before'),
    minVerifiedEvents: intFlag(flags, 'min-verified'),
  };
  if (flags.verified === true) query.hasVerifiedEvents = true;
  if (flags.frozen === true) query.scoreFrozen = true;
  if (flags.scored === true) query.hasScore = true;
  if (flags.unscored === true) query.hasScore = false;
  return query;
}

const ID_HEADER_NAMES = /^(id|userid|user_id|externalid|external_id)$/i;

/**
 * Parse the ids for `credda screen`. Inline args may be comma- and/or
 * space-separated. A file is one id per line — or a CSV, in which case only
 * the FIRST column is read (a leading header row named id/userId/externalId
 * is skipped). Deduped, order-preserving. Deliberately simple: no quoted-CSV
 * handling — an id containing a comma isn't a valid external id anyway.
 */
export function parseIdList(input: { inline?: string[]; fileText?: string }): string[] {
  const raw: string[] = [];
  if (input.inline) {
    for (const chunk of input.inline) raw.push(...chunk.split(/[\s,]+/));
  }
  if (input.fileText !== undefined) {
    const lines = input.fileText.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const cell = lines[i].split(',')[0].trim();
      if (!cell) continue;
      if (i === 0 && ID_HEADER_NAMES.test(cell)) continue; // CSV header row
      raw.push(cell);
    }
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of raw) {
    const trimmed = id.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      ids.push(trimmed);
    }
  }
  return ids;
}

function requireCsvIo(ctx: CliContext): {
  fetchCsv: NonNullable<CliContext['fetchCsv']>;
  writeFile: NonNullable<CliContext['writeFile']>;
} {
  if (!ctx.fetchCsv || !ctx.writeFile) {
    throw new Error('CSV output is not available in this environment');
  }
  return { fetchCsv: ctx.fetchCsv, writeFile: ctx.writeFile };
}

/** Classify verify input: trust-export bundle JSON, VC-JWT, or compact credential. */
export function classifyCredentialInput(
  raw: string,
): { kind: 'export'; bundle: TrustExport } | { kind: 'vc-jwt'; jwt: string } | { kind: 'compact'; credential: string } {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as { format?: string };
    if (parsed && typeof parsed === 'object' && parsed.format === 'credda-trust-export/1') {
      return { kind: 'export', bundle: parsed as TrustExport };
    }
  } catch {
    // not JSON — fall through to string formats
  }
  if (/^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(trimmed)) {
    return { kind: 'vc-jwt', jwt: trimmed };
  }
  return { kind: 'compact', credential: trimmed };
}

/** Run one CLI invocation. Returns the process exit code. */
export async function runCli(argv: string[], ctx: CliContext): Promise<number> {
  const [command, ...args] = argv;

  try {
    switch (command) {
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        ctx.out(HELP);
        return 0;

      case 'version':
      case '--version':
      case '-v':
        ctx.out(VERSION);
        return 0;

      /**
       * The one-command start. Seeds the sandbox, prints what the real formula
       * scored each synthetic subject, then reads one back through the ordinary
       * score endpoint so the developer has SEEN a round trip work.
       *
       * Deliberately human-readable rather than JSON: every other command prints
       * JSON because it is a client for a program, but this one's entire job is
       * legibility to a person in their first two minutes.
       */
      case 'quickstart': {
        const key = requireSandboxKey(ctx);
        // Parsed up front so an unknown flag fails before anything is written.
        const { flags: qsFlags } = parseFlags(args, { boolean: ['no-confirm'] });

        ctx.out('Seeding your Credda sandbox…');
        const seed = await ctx.client.seedSandbox(key);
        ctx.out('');
        ctx.out(
          seed.subjectsSkipped > 0
            ? `${seed.subjectsCreated} subject(s) created, ${seed.subjectsSkipped} already present (left untouched), ${seed.eventsWritten} event(s) written.`
            : `${seed.subjectsCreated} subject(s), ${seed.eventsWritten} event(s) written.`,
        );
        ctx.out('');

        const idWidth = Math.max(...seed.subjects.map((s) => s.userId.length), 7);
        ctx.out(`${pad('SUBJECT', idWidth)}  SCORE  BAND`);
        for (const s of seed.subjects) {
          const score = s.finalScore === null ? '—' : String(s.finalScore);
          ctx.out(`${pad(s.userId, idWidth)}  ${pad(score, 5)}  ${s.scoreBand ?? '—'}`);
        }
        ctx.out('');
        for (const s of seed.subjects) ctx.out(`${s.userId}: ${s.record}`);

        // Prove a plain read works — this is the call their integration makes.
        const first = seed.subjects[0];
        if (first) {
          ctx.out('');
          ctx.out(`Reading it back: GET /api/v1/users/${first.userId}/score`);
          const score = await ctx.client.getScore(first.userId, key);
          ctx.out(JSON.stringify(score, null, 2));
        }

        // ── The half that was missing ──────────────────────────────────────
        // Everything above is a READ of data we handed them. The product is
        // counterparty-CONFIRMED evidence, and a developer used to be able to
        // finish the entire on-ramp without meeting POST /confirmations. So
        // the quickstart now closes the loop for real: propose an outcome,
        // then respond as the counterparty (legitimate here — the create
        // response hands the raw token to whoever made the request, and this
        // is their own disposable sandbox), and print the verified event id.
        //
        // Sandbox-only by construction: `requireSandboxKey` above already
        // refused a live key. Skippable with --no-confirm for a pure read run.
        if (qsFlags['no-confirm'] !== true) {
          ctx.out('');
          ctx.out('Now the part that matters: earning a verified event.');
          ctx.out('A score you can read is wiring. An outcome someone OTHER than the subject');
          ctx.out('confirmed is evidence, and it is the only thing that moves a record into the');
          ctx.out('earned bands. Three calls, and only the first needs your key:');
          ctx.out('');

          const subject = 'sbx_confirmation_demo';
          const counterpartyRef = `client-${Date.now()}@example.test`;

          ctx.out(`  1. POST /api/v1/confirmations           (subject ${subject})`);
          const created = await ctx.client.createConfirmationRequest(
            {
              userId: subject,
              eventType: 'CONTRACT_FULFILLED',
              stakeLevel: 'MEDIUM',
              transactionValue: 1200,
              counterpartyRef,
              counterpartyName: 'Northside Property Group',
              description: 'Kitchen refit at 14 Bridge St, completed 12 March.',
            },
            key,
          );
          ctx.out(`     → ${created.confirmation.id} (${created.confirmation.status}); nothing on the ledger yet.`);
          ctx.out(`     In production you send this to the counterparty over YOUR channel:`);
          ctx.out(`       ${created.confirmUrl}`);
          ctx.out(`     Credda sends nothing and never learns their address.`);
          ctx.out('');

          ctx.out('  2. GET  /api/v1/confirmations/{id}/preview   (NO api key, token only)');
          const preview = await ctx.client.previewConfirmation(
            created.confirmation.id,
            created.confirmationToken,
          );
          ctx.out(`     They are shown: "${preview.confirmation.description ?? ''}"`);
          ctx.out('     Note what they are NOT shown: the subject id. It is not in that projection.');
          ctx.out('');

          ctx.out('  3. POST /api/v1/confirmations/{id}/respond   (NO api key, token only)');
          const decided = await ctx.client.respondToConfirmation(
            created.confirmation.id,
            created.confirmationToken,
            'confirm',
          );
          ctx.out(`     → ${decided.status}, ledger event ${decided.eventId ?? '—'}`);
          ctx.out('     isVerified: true, earned, because a distinct token-holder acted. Declining');
          ctx.out('     would have written nothing at all: no confirmation is never read as a bad outcome.');
          ctx.out('');
          ctx.out(
            `The score for ${subject} recomputes asynchronously; read it in a moment with ` +
              `"credda score ${subject}". Re-running quickstart adds another confirmed outcome to it.`,
          );
        }

        ctx.out('');
        ctx.out('Next:');
        for (const step of seed.nextSteps) ctx.out(`  ${step}`);
        ctx.out('  credda sandbox reset  wipe it and start over');
        ctx.out('');
        ctx.out(
          'All of the above is synthetic sandbox data: invisible to live keys, unable to hold a share ' +
            'token or credential, and scored by the identical deterministic formula.',
        );
        return 0;
      }

      case 'sandbox': {
        const [sub] = args;
        switch (sub) {
          case 'seed':
            show(ctx, await ctx.client.seedSandbox(requireSandboxKey(ctx)));
            return 0;
          case 'reset':
            show(ctx, await ctx.client.resetSandbox(requireSandboxKey(ctx)));
            return 0;
          default:
            throw new Error(`unknown sandbox subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'lookup':
        show(ctx, await ctx.client.resolveToken(requireArg(args, 'token')));
        return 0;

      case 'export':
        show(ctx, await ctx.client.getTrustExport(requireArg(args, 'token')));
        return 0;

      case 'verify': {
        const raw = await ctx.readInput(requireArg(args, 'file'));
        const input = classifyCredentialInput(raw);
        try {
          if (input.kind === 'export') {
            const verified = await ctx.verifiers.trustExport(input.bundle);
            show(ctx, { valid: true, kind: 'trust-export', facts: verified.credential.cred });
          } else if (input.kind === 'vc-jwt') {
            const verified = await ctx.verifiers.verifiableCredential(input.jwt);
            show(ctx, { valid: true, kind: 'w3c-vc', facts: verified.cred });
          } else {
            const verified = await ctx.verifiers.trustCredential(input.credential);
            show(ctx, { valid: true, kind: 'trust-credential', facts: verified.cred });
          }
          return 0;
        } catch (e) {
          show(ctx, { valid: false, kind: input.kind, reason: e instanceof Error ? e.message : String(e) });
          return 2;
        }
      }

      case 'registry':
        show(ctx, await ctx.client.getTrustRegistry());
        return 0;

      case 'did':
        show(ctx, await ctx.client.getDidDocument());
        return 0;

      case 'benchmarks':
        // Public catalog: cohort dimensions + the k-anonymity floor. A benchmark
        // is a distribution fact, never a verdict.
        show(ctx, await ctx.client.getBenchmarks());
        return 0;

      case 'reason-codes':
        // Public adverse-action reason-code catalog (ECOA / Reg B). Credda
        // supplies the attribution only — it is not a creditor.
        show(ctx, await ctx.client.getReasonCodes());
        return 0;

      case 'outcome-templates': {
        // Public catalog: how a real-world business maps its work to Credda
        // events, and WHO the third-party witness is for each outcome. Guidance
        // only — nothing here scores, writes, or ranks anyone. Optional
        // positional industry slug filters to one set.
        const [industry] = args;
        show(ctx, await ctx.client.getOutcomeTemplates(industry));
        return 0;
      }

      case 'badges': {
        // Public: the closed set of Open Badges 3.0 achievements this issuer
        // will sign. A verifier reads the criteria from the ISSUER rather than
        // trusting the narrative inside the document it is checking.
        const [sub, ...rest] = args;
        switch (sub) {
          case 'list':
            show(ctx, await ctx.client.getOpenBadgeAchievements());
            return 0;
          case 'get':
            show(ctx, await ctx.client.getOpenBadgeAchievement(requireArg(rest, 'badgeId')));
            return 0;
          default:
            throw new Error(`unknown badges subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'score':
        show(ctx, await ctx.client.getScore(requireArg(args, 'userId'), requireKey(ctx)));
        return 0;

      case 'explain':
        show(ctx, await ctx.client.getScoreExplain(requireArg(args, 'userId'), requireKey(ctx)));
        return 0;

      case 'components':
        show(ctx, await ctx.client.getScoreComponents(requireArg(args, 'userId'), requireKey(ctx)));
        return 0;

      case 'risk':
        show(ctx, await ctx.client.getRisk(requireArg(args, 'userId'), requireKey(ctx)));
        return 0;

      case 'trust-summary': {
        const { positional, flags } = parseFlags(args, { boolean: ['narrative'] });
        const userId = requireArg(positional, 'userId');
        show(
          ctx,
          await ctx.client.getTrustSummary(userId, requireKey(ctx), {
            narrative: flags.narrative === true,
          }),
        );
        return 0;
      }

      case 'benchmark': {
        // Where one subject sits within a cohort — percentile + distribution.
        const { positional, flags } = parseFlags(args, { valued: ['dimension'] });
        const userId = requireArg(positional, 'userId');
        show(
          ctx,
          await ctx.client.getUserBenchmark(userId, requireKey(ctx), {
            dimension: strFlag(flags, 'dimension'),
          }),
        );
        return 0;
      }

      case 'distribution': {
        // Aggregate, k-anonymised cohort distribution (or a whole dimension).
        const { positional, flags } = parseFlags(args, { valued: ['dimension', 'cohort'] });
        if (positional.length > 0) {
          throw new Error(`distribution takes no positional arguments (got "${positional[0]}"). See "credda help"`);
        }
        show(
          ctx,
          await ctx.client.getBenchmarkDistribution(requireKey(ctx), {
            dimension: strFlag(flags, 'dimension'),
            cohort: strFlag(flags, 'cohort'),
          }),
        );
        return 0;
      }

      case 'users': {
        // Query + export your book of subjects (closed filter set).
        const { positional, flags } = parseFlags(args, {
          valued: [
            'score-min', 'score-max', 'band', 'subject-type', 'active-since',
            'registered-since', 'registered-before',
            'min-verified', 'sort', 'order', 'cursor', 'limit',
          ],
          boolean: ['verified', 'scored', 'unscored', 'frozen'],
        });
        if (positional.length > 0) {
          throw new Error(`users takes no positional arguments (got "${positional[0]}"). See "credda help"`);
        }
        const query: Parameters<CreddaClient['listUsers']>[1] = {
          ...bookFilterFlags(flags),
          sort: strFlag(flags, 'sort') as 'score' | 'lastActivity' | 'registered' | 'externalId' | undefined,
          order: strFlag(flags, 'order') as 'asc' | 'desc' | undefined,
          ...pageQuery(flags),
        };
        show(ctx, await ctx.client.listUsers(requireKey(ctx), query));
        return 0;
      }

      case 'book-summary': {
        // Size a segment of the book without paging it — same closed filter set.
        const { positional, flags } = parseFlags(args, {
          valued: [
            'score-min', 'score-max', 'band', 'subject-type', 'active-since',
            'registered-since', 'registered-before', 'min-verified',
          ],
          boolean: ['verified', 'scored', 'unscored', 'frozen'],
        });
        if (positional.length > 0) {
          throw new Error(`book-summary takes no positional arguments (got "${positional[0]}"). See "credda help"`);
        }
        show(ctx, await ctx.client.getBookSummary(requireKey(ctx), bookFilterFlags(flags)));
        return 0;
      }

      case 'usage': {
        const { positional, flags } = parseFlags(args, { valued: ['from', 'to', 'csv'] });
        const days = positional[0] ? Number(positional[0]) : undefined;
        if (days !== undefined && (!Number.isInteger(days) || days < 1)) {
          throw new Error('usage [days]: days must be a positive integer');
        }
        const from = strFlag(flags, 'from');
        const to = strFlag(flags, 'to');
        if (days !== undefined && (from || to)) {
          throw new Error('usage: use either a [days] window or --from/--to, not both');
        }
        const key = requireKey(ctx);
        const outfile = strFlag(flags, 'csv');
        if (outfile) {
          const { fetchCsv, writeFile } = requireCsvIo(ctx);
          const qs = new URLSearchParams({ format: 'csv' });
          if (days !== undefined) qs.set('days', String(days));
          if (from) qs.set('from', from);
          if (to) qs.set('to', to);
          await writeFile(outfile, await fetchCsv(`/usage?${qs.toString()}`, key));
          show(ctx, { written: outfile });
          return 0;
        }
        const window = from || to ? { from, to } : days;
        show(ctx, await ctx.client.getUsage(key, window));
        return 0;
      }

      case 'activity': {
        const { positional, flags } = parseFlags(args, {
          valued: ['action', 'from', 'to', 'cursor', 'limit'],
        });
        if (positional.length > 0) {
          throw new Error(`activity takes no positional arguments (got "${positional[0]}"). See "credda help"`);
        }
        show(
          ctx,
          await ctx.client.getActivity(requireKey(ctx), {
            ...pageQuery(flags),
            action: strFlag(flags, 'action'),
            from: strFlag(flags, 'from'),
            to: strFlag(flags, 'to'),
          }),
        );
        return 0;
      }

      case 'verified-profile':
        // A SECOND measure over the same ledger — it can never move a score.
        show(ctx, await ctx.client.getVerifiedProfile(requireArg(args, 'userId'), requireKey(ctx)));
        return 0;

      case 'qualify': {
        // The claim is ALWAYS recorded; --verified-by decides whether it counts
        // as verified. Never assert it yourself — name the witness.
        const { positional, flags } = parseFlags(args, {
          valued: ['category', 'label', 'issuer', 'verified-by'],
        });
        const userId = requireArg(positional, 'userId');
        const category = strFlag(flags, 'category');
        if (!category) {
          throw new Error('qualify needs --category <education|skill|certification|employment>');
        }
        show(
          ctx,
          await ctx.client.recordQualification(
            userId,
            {
              category: category as QualificationCategory,
              label: strFlag(flags, 'label'),
              issuer: strFlag(flags, 'issuer'),
              verifiedBy: strFlag(flags, 'verified-by'),
            },
            requireKey(ctx),
          ),
        );
        return 0;
      }

      case 'professional-record': {
        const [sub, ...rest] = args;
        switch (sub) {
          case 'get':
            show(ctx, await ctx.client.getProfessionalRecord(requireArg(rest, 'userId'), requireKey(ctx)));
            return 0;
          case 'credential': {
            const { positional, flags } = parseFlags(rest, { valued: ['ttl'] });
            const userId = requireArg(positional, 'userId');
            const ttlSeconds = intFlag(flags, 'ttl');
            const minted = await ctx.client.mintProfessionalRecordCredential(
              userId,
              requireKey(ctx),
              ttlSeconds !== undefined ? { ttlSeconds } : {},
            );
            show(ctx, minted);
            return 0;
          }
          case 'public':
            // Public: the token IS the subject's consent to present the record.
            show(ctx, await ctx.client.getPublicProfessionalRecord(requireArg(rest, 'token')));
            return 0;
          default:
            throw new Error(`unknown professional-record subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'career-export': {
        // The subject's whole verified record as a JSON Resume document.
        // Keyed by default (your own subject). With --token it's the PUBLIC
        // route: the token is the subject's own consent, so NO API key is sent.
        const { positional, flags } = parseFlags(args, { valued: ['token'] });
        const token = strFlag(flags, 'token');
        if (token) {
          show(ctx, await ctx.client.getPublicCareerExport(token));
        } else {
          show(ctx, await ctx.client.getCareerExport(requireArg(positional, 'userId'), requireKey(ctx)));
        }
        return 0;
      }

      case 'reliability-report': {
        // The buy-trigger read. Keyed by default (a userId you can look up).
        // With --token it's the PUBLIC worker-consent route: the token is the
        // worker's own consent, so NO API key is sent.
        const { positional, flags } = parseFlags(args, {
          valued: ['token', 'recent'],
          boolean: ['benchmark'],
        });
        const token = strFlag(flags, 'token');
        const recent = intFlag(flags, 'recent');
        const opts = {
          ...(recent !== undefined ? { recent } : {}),
          ...(flags.benchmark === true ? { benchmark: true } : {}),
        };
        if (token) {
          show(ctx, await ctx.client.getPublicReliabilityReport(token, opts));
        } else {
          show(ctx, await ctx.client.getReliabilityReport(requireArg(positional, 'userId'), requireKey(ctx), opts));
        }
        return 0;
      }

      case 'confirmations': {
        // ⚠️ Auth is ASYMMETRIC here: preview/respond are the COUNTERPARTY's
        // calls and take no API key at all, so requireKey() is deliberately
        // scoped per-subcommand rather than hoisted for the whole group.
        const [sub, ...rest] = args;
        switch (sub) {
          case 'create': {
            const { flags } = parseFlags(rest, {
              valued: [
                'user', 'type', 'counterparty', 'counterparty-name', 'description',
                'stake', 'value', 'due', 'completed', 'return-url', 'expires-in',
                'idempotency-key',
              ],
            });
            const userId = strFlag(flags, 'user');
            const eventType = strFlag(flags, 'type');
            const counterpartyRef = strFlag(flags, 'counterparty');
            if (!userId || !eventType || !counterpartyRef) {
              throw new Error(
                'confirmations create needs --user <externalId> (the subject), --type <eventType> and --counterparty <ref> (your key for the party being asked to confirm)',
              );
            }
            const stake = strFlag(flags, 'stake');
            const value = numFlag(flags, 'value');
            const expiresInDays = intFlag(flags, 'expires-in');
            const created = await ctx.client.createConfirmationRequest(
              {
                userId,
                eventType: eventType as IngestEventType,
                counterpartyRef,
                ...(strFlag(flags, 'counterparty-name') ? { counterpartyName: strFlag(flags, 'counterparty-name') } : {}),
                ...(strFlag(flags, 'description') ? { description: strFlag(flags, 'description') } : {}),
                ...(stake ? { stakeLevel: stake as 'HIGH' | 'MEDIUM' | 'LOW' } : {}),
                ...(value !== undefined ? { transactionValue: value } : {}),
                ...(strFlag(flags, 'due') ? { dueDate: strFlag(flags, 'due') } : {}),
                ...(strFlag(flags, 'completed') ? { completedAt: strFlag(flags, 'completed') } : {}),
                ...(strFlag(flags, 'return-url') ? { returnUrl: strFlag(flags, 'return-url') } : {}),
                ...(expiresInDays !== undefined ? { expiresInDays } : {}),
              },
              requireKey(ctx),
              { idempotencyKey: strFlag(flags, 'idempotency-key') },
            );
            ctx.err('NOTE: the confirmationToken below is shown ONCE; deliver it to the counterparty over your own channel.');
            show(ctx, created);
            return 0;
          }
          case 'batch': {
            // The ACTIVATION ENGINE — bulk-create up to 100 requests from a
            // JSON file: either an array of request bodies, or { requests: [...] }.
            const { positional, flags } = parseFlags(rest, { valued: ['idempotency-key'] });
            const file = requireArg(positional, 'file');
            const parsed = JSON.parse(await ctx.readInput(file)) as unknown;
            const requests = (
              Array.isArray(parsed) ? parsed : (parsed as { requests?: unknown }).requests
            ) as Parameters<CreddaClient['createConfirmationBatch']>[0] | undefined;
            if (!Array.isArray(requests)) {
              throw new Error(
                'confirmations batch <file.json>: the file must be a JSON array of request bodies, or an object with a "requests" array',
              );
            }
            const idempotencyKey = strFlag(flags, 'idempotency-key');
            const result = await ctx.client.createConfirmationBatch(
              requests,
              requireKey(ctx),
              idempotencyKey ? { idempotencyKey } : {},
            );
            ctx.err('NOTE: each ok item below carries a confirmationToken shown ONCE; deliver it to that counterparty over your own channel.');
            show(ctx, result);
            return 0;
          }
          case 'list': {
            const { flags } = parseFlags(rest, { valued: ['status', 'cursor', 'limit'] });
            const status = strFlag(flags, 'status');
            show(
              ctx,
              await ctx.client.listConfirmations(requireKey(ctx), {
                ...pageQuery(flags),
                ...(status ? { status: status.toUpperCase() as ConfirmationStatus } : {}),
              }),
            );
            return 0;
          }
          case 'get':
            show(ctx, await ctx.client.getConfirmation(requireArg(rest, 'id'), requireKey(ctx)));
            return 0;
          case 'cancel':
            show(ctx, await ctx.client.cancelConfirmation(requireArg(rest, 'id'), requireKey(ctx)));
            return 0;
          case 'preview': {
            // KEYLESS on purpose — the counterparty holds a token, not a key.
            const { positional, flags } = parseFlags(rest, { valued: ['token'] });
            const id = requireArg(positional, 'id');
            const token = strFlag(flags, 'token');
            if (!token) throw new Error('confirmations preview needs --token <t> (the one-time token you were sent)');
            show(ctx, await ctx.client.previewConfirmation(id, token));
            return 0;
          }
          case 'respond': {
            // KEYLESS on purpose. The decision is explicit: there is no default,
            // because confirming an outcome you did not witness is the one thing
            // this primitive exists to prevent.
            const { positional, flags } = parseFlags(rest, {
              valued: ['token'],
              boolean: ['confirm', 'decline'],
            });
            const id = requireArg(positional, 'id');
            const token = strFlag(flags, 'token');
            if (!token) throw new Error('confirmations respond needs --token <t> (the one-time token you were sent)');
            const confirm = flags.confirm === true;
            const decline = flags.decline === true;
            if (confirm === decline) {
              throw new Error('confirmations respond needs exactly one of --confirm or --decline');
            }
            show(ctx, await ctx.client.respondToConfirmation(id, token, confirm ? 'confirm' : 'decline'));
            return 0;
          }
          default:
            throw new Error(`unknown confirmations subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'references': {
        // ⚠️ Same ASYMMETRIC auth as confirmations: preview/respond are the
        // reference's own calls and take no API key, so requireKey() is scoped
        // per-subcommand rather than hoisted for the whole group.
        const [sub, ...rest] = args;
        switch (sub) {
          case 'create': {
            const { flags } = parseFlags(rest, {
              valued: [
                'user', 'category', 'counterparty', 'counterparty-name', 'description',
                'label', 'issuer', 'jurisdiction', 'reference', 'return-url', 'expires-in',
                'idempotency-key',
              ],
            });
            const userId = strFlag(flags, 'user');
            const category = strFlag(flags, 'category');
            const counterpartyRef = strFlag(flags, 'counterparty');
            if (!userId || !category || !counterpartyRef) {
              throw new Error(
                'references create needs --user <externalId> (the subject), --category <employment|education|certification|skill> and --counterparty <ref> (your key for the party being asked to confirm)',
              );
            }
            const expiresInDays = intFlag(flags, 'expires-in');
            const created = await ctx.client.createReferenceRequest(
              {
                userId,
                category: category as ReferenceCategory,
                counterpartyRef,
                ...(strFlag(flags, 'label') ? { label: strFlag(flags, 'label') } : {}),
                ...(strFlag(flags, 'issuer') ? { issuer: strFlag(flags, 'issuer') } : {}),
                ...(strFlag(flags, 'jurisdiction') ? { jurisdiction: strFlag(flags, 'jurisdiction') } : {}),
                ...(strFlag(flags, 'reference') ? { reference: strFlag(flags, 'reference') } : {}),
                ...(strFlag(flags, 'counterparty-name') ? { counterpartyName: strFlag(flags, 'counterparty-name') } : {}),
                ...(strFlag(flags, 'description') ? { description: strFlag(flags, 'description') } : {}),
                ...(strFlag(flags, 'return-url') ? { returnUrl: strFlag(flags, 'return-url') } : {}),
                ...(expiresInDays !== undefined ? { expiresInDays } : {}),
              },
              requireKey(ctx),
              { idempotencyKey: strFlag(flags, 'idempotency-key') },
            );
            ctx.err('NOTE: the referenceToken below is shown ONCE; deliver it to the reference over your own channel.');
            show(ctx, created);
            return 0;
          }
          case 'list': {
            const { flags } = parseFlags(rest, { valued: ['status', 'cursor', 'limit'] });
            const status = strFlag(flags, 'status');
            show(
              ctx,
              await ctx.client.listReferences(requireKey(ctx), {
                ...pageQuery(flags),
                ...(status ? { status: status.toUpperCase() as ReferenceRequestStatus } : {}),
              }),
            );
            return 0;
          }
          case 'get':
            show(ctx, await ctx.client.getReference(requireArg(rest, 'id'), requireKey(ctx)));
            return 0;
          case 'cancel':
            show(ctx, await ctx.client.cancelReference(requireArg(rest, 'id'), requireKey(ctx)));
            return 0;
          case 'preview': {
            // KEYLESS on purpose — the reference holds a token, not a key.
            const { positional, flags } = parseFlags(rest, { valued: ['token'] });
            const id = requireArg(positional, 'id');
            const token = strFlag(flags, 'token');
            if (!token) throw new Error('references preview needs --token <t> (the one-time token you were sent)');
            show(ctx, await ctx.client.previewReference(id, token));
            return 0;
          }
          case 'respond': {
            // KEYLESS on purpose. The decision is explicit: there is no default,
            // because confirming a claim you cannot vouch for is the one thing
            // this primitive exists to prevent.
            const { positional, flags } = parseFlags(rest, {
              valued: ['token'],
              boolean: ['confirm', 'decline'],
            });
            const id = requireArg(positional, 'id');
            const token = strFlag(flags, 'token');
            if (!token) throw new Error('references respond needs --token <t> (the one-time token you were sent)');
            const confirm = flags.confirm === true;
            const decline = flags.decline === true;
            if (confirm === decline) {
              throw new Error('references respond needs exactly one of --confirm or --decline');
            }
            show(ctx, await ctx.client.respondToReference(id, token, confirm ? 'confirm' : 'decline'));
            return 0;
          }
          default:
            throw new Error(`unknown references subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'policies': {
        const [sub, ...rest] = args;
        const key = requireKey(ctx);
        switch (sub) {
          case 'list': {
            const { flags } = parseFlags(rest, { valued: ['cursor', 'limit'] });
            show(ctx, await ctx.client.listPolicies(key, pageQuery(flags)));
            return 0;
          }
          case 'get':
            show(ctx, await ctx.client.getPolicy(requireArg(rest, 'id'), key));
            return 0;
          case 'create': {
            const { flags } = parseFlags(rest, {
              valued: ['name', 'user', 'metric', 'direction', 'threshold', 'component', 'band'],
              boolean: ['all'],
            });
            const name = strFlag(flags, 'name');
            const metric = strFlag(flags, 'metric');
            if (!name || !metric) {
              throw new Error('policies create needs --name <n> and --metric <score|component|band|verified_events>');
            }
            const userId = strFlag(flags, 'user');
            const appliesToAll = flags.all === true;
            if (Boolean(userId) === appliesToAll) {
              throw new Error('policies create needs exactly one of --user <externalId> (watch one subject) or --all (watch all your subjects)');
            }
            const threshold = numFlag(flags, 'threshold');
            const input: Parameters<CreddaClient['createPolicy']>[0] = {
              name,
              metric: metric as PolicyMetric,
              ...(userId ? { userId } : { appliesToAll: true }),
            };
            const direction = strFlag(flags, 'direction');
            if (direction) input.direction = direction as PolicyDirection;
            if (threshold !== undefined) input.threshold = threshold;
            const component = strFlag(flags, 'component');
            if (component) input.component = component as PolicyComponentKey;
            const band = strFlag(flags, 'band');
            if (band) input.band = band;
            show(ctx, await ctx.client.createPolicy(input, key));
            return 0;
          }
          case 'update': {
            const { positional, flags } = parseFlags(rest, {
              valued: ['name', 'direction', 'threshold', 'component', 'band'],
              boolean: ['activate', 'deactivate'],
            });
            const id = requireArg(positional, 'id');
            if (flags.activate === true && flags.deactivate === true) {
              throw new Error('policies update: pass at most one of --activate / --deactivate');
            }
            const patch: Parameters<CreddaClient['updatePolicy']>[1] = {};
            const name = strFlag(flags, 'name');
            if (name) patch.name = name;
            const direction = strFlag(flags, 'direction');
            if (direction) patch.direction = direction as PolicyDirection;
            const threshold = numFlag(flags, 'threshold');
            if (threshold !== undefined) patch.threshold = threshold;
            const component = strFlag(flags, 'component');
            if (component) patch.component = component as PolicyComponentKey;
            const band = strFlag(flags, 'band');
            if (band) patch.band = band;
            if (flags.activate === true) patch.isActive = true;
            if (flags.deactivate === true) patch.isActive = false;
            if (Object.keys(patch).length === 0) {
              throw new Error('policies update needs at least one field to change. See "credda help"');
            }
            show(ctx, await ctx.client.updatePolicy(id, patch, key));
            return 0;
          }
          case 'delete':
            await ctx.client.deletePolicy(requireArg(rest, 'id'), key);
            show(ctx, { deleted: true });
            return 0;
          default:
            throw new Error(`unknown policies subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'monitors': {
        const [sub, ...rest] = args;
        const key = requireKey(ctx);
        switch (sub) {
          case 'list': {
            const { flags } = parseFlags(rest, { valued: ['cursor', 'limit'] });
            show(ctx, await ctx.client.listMonitors(key, pageQuery(flags)));
            return 0;
          }
          case 'get':
            show(ctx, await ctx.client.getMonitor(requireArg(rest, 'id'), key));
            return 0;
          case 'create': {
            const { flags } = parseFlags(rest, {
              valued: ['user', 'below', 'above'],
              boolean: ['band-change'],
            });
            const userId = strFlag(flags, 'user');
            if (!userId) {
              throw new Error('monitors create needs --user <externalId> (the user to watch)');
            }
            const belowScore = numFlag(flags, 'below');
            const aboveScore = numFlag(flags, 'above');
            const onBandChange = flags['band-change'] === true;
            if (belowScore === undefined && aboveScore === undefined && !onBandChange) {
              throw new Error(
                'monitors create needs at least one condition: --below <score> (fires when the score crosses DOWN through it), --above <score> (crosses UP), or --band-change (any band change)',
              );
            }
            show(
              ctx,
              await ctx.client.createMonitor(
                {
                  userId,
                  ...(belowScore !== undefined ? { belowScore } : {}),
                  ...(aboveScore !== undefined ? { aboveScore } : {}),
                  ...(onBandChange ? { onBandChange } : {}),
                },
                key,
              ),
            );
            return 0;
          }
          case 'delete':
            await ctx.client.deleteMonitor(requireArg(rest, 'id'), key);
            show(ctx, { deleted: true });
            return 0;
          default:
            throw new Error(`unknown monitors subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'screen': {
        const { positional, flags } = parseFlags(args, {
          valued: ['file'],
          boolean: ['wait'],
        });
        const file = strFlag(flags, 'file');
        if (file && positional.length > 0) {
          throw new Error('screen: pass ids inline OR --file <path>, not both');
        }
        const ids = parseIdList(
          file ? { fileText: await ctx.readInput(file) } : { inline: positional },
        );
        if (ids.length === 0) {
          throw new Error('screen: no ids found. Pass ids (comma/space separated) or --file <path> (one id per line, or a CSV whose first column is the id)');
        }
        const key = requireKey(ctx);
        let job = (await ctx.client.createScreening(ids, key)).screening;
        if (flags.wait === true) {
          const sleep = ctx.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
          const interval = ctx.pollIntervalMs ?? 2000;
          while (job.status === 'QUEUED' || job.status === 'RUNNING') {
            ctx.err(`screening ${job.id}: ${job.status}, waiting…`);
            await sleep(interval);
            job = (await ctx.client.getScreening(job.id, key)).screening;
          }
          show(ctx, { screening: job });
          return job.status === 'COMPLETED' ? 0 : 1;
        }
        show(ctx, { screening: job });
        if (job.status === 'QUEUED' || job.status === 'RUNNING') {
          ctx.err(`still ${job.status}; poll with "credda screenings get ${job.id}" (or re-run with --wait)`);
        }
        return 0;
      }

      case 'screenings': {
        const [sub, ...rest] = args;
        const key = requireKey(ctx);
        switch (sub) {
          case 'list': {
            const { flags } = parseFlags(rest, { valued: ['cursor', 'limit'] });
            show(ctx, await ctx.client.listScreenings(key, pageQuery(flags)));
            return 0;
          }
          case 'get':
            show(ctx, await ctx.client.getScreening(requireArg(rest, 'id'), key));
            return 0;
          case 'results': {
            const { positional, flags } = parseFlags(rest, { valued: ['csv'] });
            const id = requireArg(positional, 'id');
            const outfile = strFlag(flags, 'csv');
            if (outfile) {
              const { fetchCsv, writeFile } = requireCsvIo(ctx);
              await writeFile(
                outfile,
                await fetchCsv(`/screenings/${encodeURIComponent(id)}/results?format=csv`, key),
              );
              show(ctx, { written: outfile });
              return 0;
            }
            show(ctx, await ctx.client.getScreeningResults(id, key));
            return 0;
          }
          default:
            throw new Error(`unknown screenings subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'webhooks': {
        const [sub, ...rest] = args;
        const key = requireKey(ctx);
        switch (sub) {
          case 'list':
            show(ctx, await ctx.client.listWebhooks(key));
            return 0;
          case 'create': {
            const url = requireArg(rest, 'url');
            const events = rest.slice(1);
            if (events.length === 0) {
              throw new Error('webhooks create <url> <event...>: provide at least one event (score.updated, score.band_changed, dispute.resolved, monitor.triggered, usage.quota_warning)');
            }
            const created = await ctx.client.createWebhook({ url, events: events as never }, key);
            ctx.err('NOTE: the signing secret below is shown ONCE; store it now.');
            show(ctx, created);
            return 0;
          }
          case 'delete':
            await ctx.client.deleteWebhook(requireArg(rest, 'id'), key);
            show(ctx, { deleted: true });
            return 0;
          case 'test':
            show(ctx, await ctx.client.testWebhook(requireArg(rest, 'id'), key));
            return 0;
          case 'deliveries':
            show(ctx, await ctx.client.getWebhookDeliveries(requireArg(rest, 'id'), key, 25));
            return 0;
          case 'recent': {
            // Sample data across ALL endpoints — falls back to the event
            // catalog's examples (isExample:true) when nothing has fired yet.
            const eventType = rest.length > 0 ? (rest as never) : undefined;
            show(ctx, await ctx.client.getRecentWebhookEvents(key, { limit: 25, eventType }));
            return 0;
          }
          default:
            throw new Error(`unknown webhooks subcommand "${sub ?? ''}". See "credda help"`);
        }
      }

      case 'listen': {
        if (!ctx.startListener) throw new Error('listen is not available in this environment');
        const port = args[0] ? Number(args[0]) : 4141;
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('listen [port]: port must be 1-65535');
        }
        await ctx.startListener({ port, secret: ctx.webhookSecret });
        return 0;
      }

      case 'mint':
        show(ctx, await ctx.client.mintShareToken(requireArg(args, 'userId'), requireKey(ctx)));
        return 0;

      case 'revoke':
        await ctx.client.revokeShareToken(requireArg(args, 'userId'), requireKey(ctx));
        show(ctx, { revoked: true });
        return 0;

      default:
        throw new Error(`unknown command "${command}". See "credda help"`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // SDK errors already carry a "credda:" prefix — don't double it.
    ctx.err(message.startsWith('credda:') ? message : `credda: ${message}`);
    for (const line of errorHints(e)) ctx.err(line);
    return 1;
  }
}
