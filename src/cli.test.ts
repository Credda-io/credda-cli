import { describe, expect, it, vi } from 'vitest';
import { classifyCredentialInput, errorHints, parseFlags, parseIdList, runCli, type CliContext } from './cli.js';
import type { CreddaClient } from '@credda/js/headless';

function makeCtx(overrides: Partial<CliContext> = {}): CliContext & {
  lines: string[];
  errors: string[];
} {
  const lines: string[] = [];
  const errors: string[] = [];
  const client = {
    resolveToken: vi.fn().mockResolvedValue({ token: 'tok', finalScore: 87 }),
    getTrustExport: vi.fn().mockResolvedValue({ format: 'credda-trust-export/1' }),
    getTrustRegistry: vi.fn().mockResolvedValue({ issuers: [] }),
    getDidDocument: vi.fn().mockResolvedValue({ id: 'did:web:api.credda.io' }),
    getScore: vi.fn().mockResolvedValue({ finalScore: 87 }),
    getScoreExplain: vi.fn().mockResolvedValue({ factors: [] }),
    getScoreComponents: vi.fn().mockResolvedValue({ components: [] }),
    getRisk: vi.fn().mockResolvedValue({ signals: [] }),
    getUsage: vi.fn().mockResolvedValue({ days: [] }),
    mintShareToken: vi.fn().mockResolvedValue({ token: 'newtok' }),
    revokeShareToken: vi.fn().mockResolvedValue(undefined),
    listWebhooks: vi.fn().mockResolvedValue({ data: [] }),
    createWebhook: vi.fn().mockResolvedValue({ webhook: { id: 'wh_1' }, secret: 'whsec_x' }),
    deleteWebhook: vi.fn().mockResolvedValue(undefined),
    testWebhook: vi.fn().mockResolvedValue({ success: true }),
    getWebhookDeliveries: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getRecentWebhookEvents: vi.fn().mockResolvedValue({ data: [], nextCursor: null, source: 'examples' }),
    getActivity: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    listMonitors: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getMonitor: vi.fn().mockResolvedValue({ monitor: { id: 'mon_1' } }),
    createMonitor: vi.fn().mockResolvedValue({ monitor: { id: 'mon_1', belowScore: 40 } }),
    deleteMonitor: vi.fn().mockResolvedValue(undefined),
    createScreening: vi.fn().mockResolvedValue({
      screening: { id: 'scr_1', status: 'COMPLETED', totalCount: 2, foundCount: 2 },
    }),
    listScreenings: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getScreening: vi.fn().mockResolvedValue({ screening: { id: 'scr_1', status: 'COMPLETED' } }),
    getScreeningResults: vi.fn().mockResolvedValue({ screening: { id: 'scr_1' }, results: [], count: 0 }),
    getBenchmarks: vi.fn().mockResolvedValue({ benchmarkVersion: '1', kAnonymity: { minimumCohortSize: 20 } }),
    getReasonCodes: vi.fn().mockResolvedValue({ reasonCodesVersion: '1', codes: [] }),
    getOutcomeTemplates: vi.fn().mockResolvedValue({ version: '1.0', industries: [], templates: [] }),
    getBenchmarkDistribution: vi.fn().mockResolvedValue({ dimension: 'all', populationSize: 3, cohorts: [] }),
    getUserBenchmark: vi.fn().mockResolvedValue({ userId: 'u1', available: true, percentile: 72 }),
    listUsers: vi.fn().mockResolvedValue({ data: [], count: 0, nextCursor: null }),
    getBookSummary: vi.fn().mockResolvedValue({
      formulaVersion: '5.3', matched: 0, scored: 0, unscored: 0,
      central: { median: null, mean: null }, bandDistribution: [],
    }),
    getTrustSummary: vi.fn().mockResolvedValue({ userId: 'u1', available: true, summary: '...' }),
    getOpenBadgeAchievements: vi.fn().mockResolvedValue({ achievementIds: ['first-delivery'], achievements: [] }),
    getOpenBadgeAchievement: vi.fn().mockResolvedValue({ id: 'first-delivery', achievementType: 'Badge' }),
    createConfirmationRequest: vi.fn().mockResolvedValue({
      confirmation: { id: 'cnf_1', status: 'PENDING', resultingEventId: null },
      confirmationToken: 'raw_token',
      confirmUrl: 'https://api.credda.io/confirm/cnf_1?token=raw_token',
      previewUrl: 'https://api.credda.io/api/v1/confirmations/cnf_1/preview?token=raw_token',
      respondUrl: 'https://api.credda.io/api/v1/confirmations/cnf_1/respond',
    }),
    listConfirmations: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getConfirmation: vi.fn().mockResolvedValue({ confirmation: { id: 'cnf_1' } }),
    cancelConfirmation: vi.fn().mockResolvedValue({ confirmation: { id: 'cnf_1', status: 'CANCELLED' } }),
    previewConfirmation: vi.fn().mockResolvedValue({ confirmation: { id: 'cnf_1', platform: 'Acme' } }),
    respondToConfirmation: vi.fn().mockResolvedValue({ status: 'CONFIRMED', confirmation: { id: 'cnf_1' }, eventId: 'ev_1' }),
    createConfirmationBatch: vi.fn().mockResolvedValue({
      total: 2, created: 1, failed: 1,
      results: [
        { index: 0, ok: true, userId: 'u1', id: 'cnf_1', status: 'PENDING', confirmationToken: 'raw_1', confirmUrl: 'https://api.credda.io/confirm/cnf_1?token=raw_1' },
        { index: 1, ok: false, userId: 'u2', error: 'cannot confirm your own outcome', code: 'CONFIRMATION_SELF' },
      ],
    }),
    createReferenceRequest: vi.fn().mockResolvedValue({
      reference: { id: 'rf_1', status: 'PENDING', resultingEventId: null },
      referenceToken: 'raw_token',
      referenceUrl: 'https://api.credda.io/reference/rf_1?token=raw_token',
      previewUrl: 'https://api.credda.io/api/v1/references/rf_1/preview?token=raw_token',
      respondUrl: 'https://api.credda.io/api/v1/references/rf_1/respond',
    }),
    listReferences: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getReference: vi.fn().mockResolvedValue({ reference: { id: 'rf_1' } }),
    cancelReference: vi.fn().mockResolvedValue({ reference: { id: 'rf_1', status: 'CANCELLED' } }),
    previewReference: vi.fn().mockResolvedValue({ reference: { id: 'rf_1', platform: 'Acme' } }),
    respondToReference: vi.fn().mockResolvedValue({ status: 'CONFIRMED', reference: { id: 'rf_1' }, eventId: 'ev_1' }),
    createPolicy: vi.fn().mockResolvedValue({ policy: { id: 'pol_1' } }),
    listPolicies: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getPolicy: vi.fn().mockResolvedValue({ policy: { id: 'pol_1' } }),
    updatePolicy: vi.fn().mockResolvedValue({ policy: { id: 'pol_1', threshold: 55 } }),
    deletePolicy: vi.fn().mockResolvedValue(undefined),
    getVerifiedProfile: vi.fn().mockResolvedValue({ userId: 'u1', verificationDepth: 0.75 }),
    recordQualification: vi.fn().mockResolvedValue({ eventId: 'ev_2', isVerified: true, verificationNote: null }),
    getProfessionalRecord: vi.fn().mockResolvedValue({ userId: 'u1', professionalRecordVersion: '1.0' }),
    mintProfessionalRecordCredential: vi.fn().mockResolvedValue({
      credentialType: 'CreddaProfessionalRecordCredential',
      linkedin: { addToProfileUrl: 'https://www.linkedin.com/profile/add' },
    }),
    getPublicProfessionalRecord: vi.fn().mockResolvedValue({ token: 'tok', professionalRecord: null }),
    getReliabilityReport: vi.fn().mockResolvedValue({ userId: 'u1', reliabilityReportVersion: '1.0', reliability: { band: 'Good' } }),
    getPublicReliabilityReport: vi.fn().mockResolvedValue({ token: 'tok', reliabilityReport: null }),
    getCareerExport: vi.fn().mockResolvedValue({ $schema: 'https://jsonresume.org/schema', meta: {} }),
    getPublicCareerExport: vi.fn().mockResolvedValue({ $schema: 'https://jsonresume.org/schema', meta: {} }),
    seedSandbox: vi.fn().mockResolvedValue({
      seeded: true,
      livemode: false,
      seedVersion: 1,
      subjectsCreated: 2,
      subjectsSkipped: 0,
      eventsWritten: 13,
      subjects: [
        {
          userId: 'sbx_reliable_courier', label: 'Reliable courier',
          record: 'Twelve confirmed deliveries, all on time.',
          tryNext: 'GET /api/v1/users/sbx_reliable_courier/score/explain',
          totalEvents: 12, eventsWritten: 12, alreadySeeded: false,
          finalScore: 81, scoreBand: 'Excellent', confidence: 1,
        },
        {
          userId: 'sbx_new_signup', label: 'Brand-new subject',
          record: 'One self-reported completion, three days old.',
          tryNext: 'POST /api/v1/users/sbx_new_signup/score/project',
          totalEvents: 1, eventsWritten: 1, alreadySeeded: false,
          finalScore: 21.89, scoreBand: 'Unproven', confidence: 0,
        },
      ],
      note: 'Synthetic sandbox data.',
      nextSteps: ['GET /api/v1/users/sbx_reliable_courier/score'],
    }),
    resetSandbox: vi.fn().mockResolvedValue({
      reset: true,
      deleted: { users: 2, events: 13, screenings: 0, imports: 0, ingestMappings: 0, confirmations: 0 },
      note: 'Test data only.',
    }),
  } as unknown as CreddaClient;

  return {
    client,
    apiKey: undefined,
    out: (l) => lines.push(l),
    err: (l) => errors.push(l),
    readInput: vi.fn().mockResolvedValue(''),
    verifiers: {
      trustCredential: vi.fn().mockResolvedValue({ valid: true, cred: { scoreBand: 'GOOD' } }),
      verifiableCredential: vi.fn().mockResolvedValue({ valid: true, cred: { scoreBand: 'GOOD' } }),
      trustExport: vi.fn().mockResolvedValue({ credential: { cred: { scoreBand: 'GOOD' } } }),
    },
    lines,
    errors,
    ...overrides,
  } as CliContext & { lines: string[]; errors: string[] };
}

describe('classifyCredentialInput', () => {
  it('detects a trust-export bundle by its format marker', () => {
    const raw = JSON.stringify({ format: 'credda-trust-export/1', score: {} });
    expect(classifyCredentialInput(raw)).toMatchObject({ kind: 'export' });
  });

  it('detects a VC-JWT by its three-part eyJ shape', () => {
    expect(classifyCredentialInput('eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJ4In0.c2ln')).toMatchObject({ kind: 'vc-jwt' });
  });

  it('falls back to compact trust credential for anything else', () => {
    expect(classifyCredentialInput('CRD1.someopaquecredential')).toMatchObject({ kind: 'compact' });
    // JSON that is NOT an export bundle is still treated as an opaque string
    expect(classifyCredentialInput('{"foo":1}')).toMatchObject({ kind: 'compact' });
  });
});

describe('runCli', () => {
  it('help exits 0 and prints usage', async () => {
    const ctx = makeCtx();
    expect(await runCli(['help'], ctx)).toBe(0);
    expect(ctx.lines.join('\n')).toContain('credda lookup');
  });

  it('no command behaves like help', async () => {
    const ctx = makeCtx();
    expect(await runCli([], ctx)).toBe(0);
    expect(ctx.lines.join('\n')).toContain('Exit codes');
  });

  it('lookup resolves the token and prints JSON', async () => {
    const ctx = makeCtx();
    expect(await runCli(['lookup', 'tok'], ctx)).toBe(0);
    expect(ctx.client.resolveToken).toHaveBeenCalledWith('tok');
    expect(JSON.parse(ctx.lines[0])).toMatchObject({ finalScore: 87 });
  });

  it('lookup without a token is a usage error (exit 1)', async () => {
    const ctx = makeCtx();
    expect(await runCli(['lookup'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('missing required argument');
  });

  it('unknown command exits 1 with a pointer to help', async () => {
    const ctx = makeCtx();
    expect(await runCli(['frobnicate'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('unknown command');
  });

  it('keyed commands refuse to run without CREDDA_API_KEY', async () => {
    const ctx = makeCtx();
    expect(await runCli(['score', 'user_1'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('CREDDA_API_KEY');
    expect(ctx.client.getScore).not.toHaveBeenCalled();
  });

  it('score passes the key through when present', async () => {
    const ctx = makeCtx({ apiKey: 'crd_live_x' });
    expect(await runCli(['score', 'user_1'], ctx)).toBe(0);
    expect(ctx.client.getScore).toHaveBeenCalledWith('user_1', 'crd_live_x');
  });

  it('usage validates the optional days argument', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['usage', 'nope'], ctx)).toBe(1);
    expect(await runCli(['usage', '30'], ctx)).toBe(0);
    expect(ctx.client.getUsage).toHaveBeenCalledWith('k', 30);
  });

  it('verify routes a VC-JWT to the vc verifier and exits 0 when valid', async () => {
    const ctx = makeCtx({
      readInput: vi.fn().mockResolvedValue('eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJ4In0.c2ln'),
    });
    expect(await runCli(['verify', 'cred.jwt'], ctx)).toBe(0);
    expect(ctx.verifiers.verifiableCredential).toHaveBeenCalled();
    expect(JSON.parse(ctx.lines[0])).toMatchObject({ valid: true, kind: 'w3c-vc' });
  });

  it('verify exits 2 (not 1) when the credential fails verification', async () => {
    const ctx = makeCtx({
      readInput: vi.fn().mockResolvedValue('eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJ4In0.c2ln'),
      verifiers: {
        trustCredential: vi.fn(),
        verifiableCredential: vi.fn().mockRejectedValue(new Error('credda: signature verification failed')),
        trustExport: vi.fn(),
      },
    });
    expect(await runCli(['verify', 'cred.jwt'], ctx)).toBe(2);
    expect(JSON.parse(ctx.lines[0])).toMatchObject({ valid: false, kind: 'vc-jwt' });
  });

  it('verify routes a trust-export bundle to the export verifier', async () => {
    const ctx = makeCtx({
      readInput: vi.fn().mockResolvedValue(JSON.stringify({ format: 'credda-trust-export/1' })),
    });
    expect(await runCli(['verify', 'export.json'], ctx)).toBe(0);
    expect(ctx.verifiers.trustExport).toHaveBeenCalled();
    expect(JSON.parse(ctx.lines[0])).toMatchObject({ valid: true, kind: 'trust-export' });
  });

  it('webhooks subcommands require a key and route to the client', async () => {
    const noKey = makeCtx();
    expect(await runCli(['webhooks', 'list'], noKey)).toBe(1);
    expect(noKey.errors[0]).toContain('CREDDA_API_KEY');

    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['webhooks', 'list'], ctx)).toBe(0);
    expect(ctx.client.listWebhooks).toHaveBeenCalledWith('k');

    expect(await runCli(['webhooks', 'create', 'https://h.example/w', 'score.updated'], ctx)).toBe(0);
    expect(ctx.client.createWebhook).toHaveBeenCalledWith({ url: 'https://h.example/w', events: ['score.updated'] }, 'k');
    expect(ctx.errors.join(' ')).toContain('shown ONCE');

    expect(await runCli(['webhooks', 'create', 'https://h.example/w'], ctx)).toBe(1); // no events
    expect(await runCli(['webhooks', 'test', 'wh_1'], ctx)).toBe(0);
    expect(await runCli(['webhooks', 'deliveries', 'wh_1'], ctx)).toBe(0);

    // Sample data across every endpoint, optionally filtered by event type.
    expect(await runCli(['webhooks', 'recent'], ctx)).toBe(0);
    expect(ctx.client.getRecentWebhookEvents).toHaveBeenCalledWith('k', { limit: 25, eventType: undefined });
    expect(await runCli(['webhooks', 'recent', 'score.updated'], ctx)).toBe(0);
    expect(ctx.client.getRecentWebhookEvents).toHaveBeenCalledWith('k', { limit: 25, eventType: ['score.updated'] });

    expect(await runCli(['webhooks', 'nope'], ctx)).toBe(1);
  });

  it('listen validates the port and delegates to the injected listener', async () => {
    const started: Array<{ port: number; secret?: string }> = [];
    const ctx = makeCtx({
      webhookSecret: 'whsec_s',
      startListener: async (o: { port: number; secret?: string }) => { started.push(o); },
    } as never);
    expect(await runCli(['listen'], ctx)).toBe(0);
    expect(started[0]).toEqual({ port: 4141, secret: 'whsec_s' });
    expect(await runCli(['listen', '9999'], ctx)).toBe(0);
    expect(started[1].port).toBe(9999);
    expect(await runCli(['listen', 'abc'], ctx)).toBe(1);
  });

  it('revoke reports success as JSON', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['revoke', 'user_1'], ctx)).toBe(0);
    expect(JSON.parse(ctx.lines[0])).toEqual({ revoked: true });
  });
});

describe('parseFlags', () => {
  it('splits valued flags, boolean flags, and positionals', () => {
    const r = parseFlags(['a', '--limit', '5', '--band-change', 'b'], {
      valued: ['limit'],
      boolean: ['band-change'],
    });
    expect(r).toEqual({ positional: ['a', 'b'], flags: { limit: '5', 'band-change': true } });
  });

  it('rejects unknown flags and valued flags missing a value', () => {
    expect(() => parseFlags(['--nope'], {})).toThrow(/unknown flag --nope/);
    expect(() => parseFlags(['--limit'], { valued: ['limit'] })).toThrow(/--limit needs a value/);
  });
});

describe('parseIdList', () => {
  it('splits inline args on commas and whitespace, deduped', () => {
    expect(parseIdList({ inline: ['u1,u2', 'u3', 'u2'] })).toEqual(['u1', 'u2', 'u3']);
  });

  it('reads one id per line from a file, skipping blanks', () => {
    expect(parseIdList({ fileText: 'u1\n\nu2\r\nu3\n' })).toEqual(['u1', 'u2', 'u3']);
  });

  it('takes the first CSV column and skips a header row', () => {
    expect(parseIdList({ fileText: 'externalId,name\nu1,Ann\nu2,Bo\n' })).toEqual(['u1', 'u2']);
    // no header — first line is a real id
    expect(parseIdList({ fileText: 'u9,Zed\nu1,Ann\n' })).toEqual(['u9', 'u1']);
  });
});

describe('monitors', () => {
  it('requires CREDDA_API_KEY', async () => {
    const ctx = makeCtx();
    expect(await runCli(['monitors', 'list'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('CREDDA_API_KEY');
  });

  it('list passes cursor/limit through', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['monitors', 'list', '--limit', '10', '--cursor', 'mon0'], ctx)).toBe(0);
    expect(ctx.client.listMonitors).toHaveBeenCalledWith('k', { limit: 10, cursor: 'mon0' });
  });

  it('get and delete route to the client', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['monitors', 'get', 'mon_1'], ctx)).toBe(0);
    expect(ctx.client.getMonitor).toHaveBeenCalledWith('mon_1', 'k');
    expect(await runCli(['monitors', 'delete', 'mon_1'], ctx)).toBe(0);
    expect(ctx.client.deleteMonitor).toHaveBeenCalledWith('mon_1', 'k');
    expect(JSON.parse(ctx.lines.at(-1)!)).toEqual({ deleted: true });
  });

  it('create requires --user and at least one condition', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['monitors', 'create', '--below', '40'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('--user');
    expect(await runCli(['monitors', 'create', '--user', 'u1'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('at least one condition');
    expect(ctx.client.createMonitor).not.toHaveBeenCalled();
  });

  it('create maps flags to CreateMonitorInput', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(['monitors', 'create', '--user', 'u1', '--below', '40', '--band-change'], ctx),
    ).toBe(0);
    expect(ctx.client.createMonitor).toHaveBeenCalledWith(
      { userId: 'u1', belowScore: 40, onBandChange: true },
      'k',
    );
  });

  it('create rejects a non-numeric threshold', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['monitors', 'create', '--user', 'u1', '--below', 'nope'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('--below must be a number');
  });

  it('unknown subcommand exits 1', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['monitors', 'frob'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('unknown monitors subcommand');
  });
});

describe('screen', () => {
  it('submits inline ids and prints the job', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['screen', 'u1,u2', 'u3'], ctx)).toBe(0);
    expect(ctx.client.createScreening).toHaveBeenCalledWith(['u1', 'u2', 'u3'], 'k');
    expect(JSON.parse(ctx.lines[0])).toMatchObject({ screening: { id: 'scr_1', status: 'COMPLETED' } });
  });

  it('reads ids from --file via readInput', async () => {
    const ctx = makeCtx({
      apiKey: 'k',
      readInput: vi.fn().mockResolvedValue('id,name\nu1,Ann\nu2,Bo\n'),
    });
    expect(await runCli(['screen', '--file', 'roster.csv'], ctx)).toBe(0);
    expect(ctx.readInput).toHaveBeenCalledWith('roster.csv');
    expect(ctx.client.createScreening).toHaveBeenCalledWith(['u1', 'u2'], 'k');
  });

  it('rejects ids AND --file together, and an empty id set', async () => {
    const ctx = makeCtx({ apiKey: 'k', readInput: vi.fn().mockResolvedValue('') });
    expect(await runCli(['screen', 'u1', '--file', 'f.csv'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('not both');
    expect(await runCli(['screen', '--file', 'f.csv'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('no ids found');
    expect(ctx.client.createScreening).not.toHaveBeenCalled();
  });

  it('requires CREDDA_API_KEY', async () => {
    const ctx = makeCtx();
    expect(await runCli(['screen', 'u1'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('CREDDA_API_KEY');
  });

  it('--wait polls until terminal state then prints the summary', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({ apiKey: 'k', sleep, pollIntervalMs: 1 });
    (ctx.client.createScreening as ReturnType<typeof vi.fn>).mockResolvedValue({
      screening: { id: 'scr_9', status: 'QUEUED', totalCount: 2, foundCount: null },
    });
    (ctx.client.getScreening as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ screening: { id: 'scr_9', status: 'RUNNING' } })
      .mockResolvedValueOnce({ screening: { id: 'scr_9', status: 'COMPLETED', foundCount: 2 } });
    expect(await runCli(['screen', 'u1,u2', '--wait'], ctx)).toBe(0);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(ctx.client.getScreening).toHaveBeenCalledTimes(2);
    expect(JSON.parse(ctx.lines[0])).toMatchObject({ screening: { status: 'COMPLETED', foundCount: 2 } });
  });

  it('--wait exits 1 when the job FAILED', async () => {
    const ctx = makeCtx({ apiKey: 'k', sleep: vi.fn().mockResolvedValue(undefined), pollIntervalMs: 1 });
    (ctx.client.createScreening as ReturnType<typeof vi.fn>).mockResolvedValue({
      screening: { id: 'scr_9', status: 'QUEUED' },
    });
    (ctx.client.getScreening as ReturnType<typeof vi.fn>).mockResolvedValue({
      screening: { id: 'scr_9', status: 'FAILED', error: 'boom' },
    });
    expect(await runCli(['screen', 'u1', '--wait'], ctx)).toBe(1);
    expect(JSON.parse(ctx.lines[0])).toMatchObject({ screening: { status: 'FAILED' } });
  });

  it('without --wait, a queued job prints a polling hint to stderr', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    (ctx.client.createScreening as ReturnType<typeof vi.fn>).mockResolvedValue({
      screening: { id: 'scr_9', status: 'QUEUED' },
    });
    expect(await runCli(['screen', 'u1'], ctx)).toBe(0);
    expect(ctx.errors.join(' ')).toContain('credda screenings get scr_9');
  });
});

describe('screenings', () => {
  it('list/get route to the client with pagination', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['screenings', 'list', '--limit', '5', '--cursor', 'scr0'], ctx)).toBe(0);
    expect(ctx.client.listScreenings).toHaveBeenCalledWith('k', { limit: 5, cursor: 'scr0' });
    expect(await runCli(['screenings', 'get', 'scr_1'], ctx)).toBe(0);
    expect(ctx.client.getScreening).toHaveBeenCalledWith('scr_1', 'k');
  });

  it('results prints JSON by default', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['screenings', 'results', 'scr_1'], ctx)).toBe(0);
    expect(ctx.client.getScreeningResults).toHaveBeenCalledWith('scr_1', 'k');
  });

  it('results --csv fetches the CSV raw and writes the file', async () => {
    const fetchCsv = vi.fn().mockResolvedValue('externalId,found\nu1,true\n');
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({ apiKey: 'k', fetchCsv, writeFile });
    expect(await runCli(['screenings', 'results', 'scr_1', '--csv', 'out.csv'], ctx)).toBe(0);
    expect(fetchCsv).toHaveBeenCalledWith('/screenings/scr_1/results?format=csv', 'k');
    expect(writeFile).toHaveBeenCalledWith('out.csv', 'externalId,found\nu1,true\n');
    expect(ctx.client.getScreeningResults).not.toHaveBeenCalled();
    expect(JSON.parse(ctx.lines[0])).toEqual({ written: 'out.csv' });
  });

  it('unknown subcommand exits 1', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['screenings', 'frob'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('unknown screenings subcommand');
  });
});

describe('activity', () => {
  it('requires a key and passes filters through', async () => {
    const noKey = makeCtx();
    expect(await runCli(['activity'], noKey)).toBe(1);
    expect(noKey.errors[0]).toContain('CREDDA_API_KEY');

    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(
        ['activity', '--action', 'EVENT_CREATED', '--from', '2026-07-01', '--to', '2026-07-22', '--limit', '5', '--cursor', 'a0'],
        ctx,
      ),
    ).toBe(0);
    expect(ctx.client.getActivity).toHaveBeenCalledWith('k', {
      limit: 5,
      cursor: 'a0',
      action: 'EVENT_CREATED',
      from: '2026-07-01',
      to: '2026-07-22',
    });
  });

  it('rejects stray positional arguments', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['activity', 'oops'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('no positional arguments');
  });
});

describe('usage ranges + csv', () => {
  it('keeps the original [days] behavior (still called with a bare number)', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['usage', '30'], ctx)).toBe(0);
    expect(ctx.client.getUsage).toHaveBeenCalledWith('k', 30);
    expect(await runCli(['usage'], ctx)).toBe(0);
    expect(ctx.client.getUsage).toHaveBeenLastCalledWith('k', undefined);
  });

  it('--from/--to pass a range object', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['usage', '--from', '2026-06-01', '--to', '2026-06-30'], ctx)).toBe(0);
    expect(ctx.client.getUsage).toHaveBeenCalledWith('k', { from: '2026-06-01', to: '2026-06-30' });
  });

  it('rejects [days] combined with --from/--to', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['usage', '30', '--from', '2026-06-01'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('not both');
    expect(ctx.client.getUsage).not.toHaveBeenCalled();
  });

  it('--csv raw-fetches the statement and writes the file', async () => {
    const fetchCsv = vi.fn().mockResolvedValue('row,date\nday,2026-07-01\n');
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({ apiKey: 'k', fetchCsv, writeFile });
    expect(await runCli(['usage', '--from', '2026-06-01', '--to', '2026-06-30', '--csv', 'usage.csv'], ctx)).toBe(0);
    expect(fetchCsv).toHaveBeenCalledWith(
      '/usage?format=csv&from=2026-06-01&to=2026-06-30',
      'k',
    );
    expect(writeFile).toHaveBeenCalledWith('usage.csv', 'row,date\nday,2026-07-01\n');
    expect(ctx.client.getUsage).not.toHaveBeenCalled();
    expect(JSON.parse(ctx.lines[0])).toEqual({ written: 'usage.csv' });
  });

  it('--csv with a [days] window keeps days in the query', async () => {
    const fetchCsv = vi.fn().mockResolvedValue('csv');
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({ apiKey: 'k', fetchCsv, writeFile });
    expect(await runCli(['usage', '14', '--csv', 'u.csv'], ctx)).toBe(0);
    expect(fetchCsv).toHaveBeenCalledWith('/usage?format=csv&days=14', 'k');
  });
});

describe('failure output', () => {
  /** A CreddaError-shaped rejection, without importing the class. */
  function creddaError(extra: Record<string, unknown>) {
    return Object.assign(new Error('credda: Not found'), extra);
  }

  it('prints the request id so a CLI user has something to quote', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    (ctx.client.getScore as unknown as { mockRejectedValue: (e: unknown) => void })
      .mockRejectedValue(creddaError({ status: 404, code: 'USER_NOT_FOUND', requestId: 'rq-1' }));

    expect(await runCli(['score', 'u1'], ctx)).toBe(1);
    const out = ctx.errors.join('\n');
    expect(out).toContain('credda: Not found');
    expect(out).toContain('rq-1');
    expect(out).toContain('USER_NOT_FOUND');
    // Never doubles the SDK's own prefix.
    expect(out).not.toContain('credda: credda:');
  });

  it('prints the back-off the server asked for on a 429', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    (ctx.client.getScore as unknown as { mockRejectedValue: (e: unknown) => void })
      .mockRejectedValue(creddaError({ status: 429, code: 'QUOTA_EXCEEDED', requestId: 'rq-2', retryAfterMs: 45000 }));

    expect(await runCli(['score', 'u1'], ctx)).toBe(1);
    expect(ctx.errors.join('\n')).toContain('45s');
  });

  it('adds no noise for a plain local error (bad usage)', async () => {
    const ctx = makeCtx();
    expect(await runCli(['nonsense'], ctx)).toBe(1);
    expect(ctx.errors).toHaveLength(1);
    expect(ctx.errors[0]).toContain('unknown command');
  });
});

describe('errorHints', () => {
  it('returns nothing for non-object throws', () => {
    expect(errorHints('boom')).toEqual([]);
    expect(errorHints(undefined)).toEqual([]);
    expect(errorHints(new Error('plain'))).toEqual([]);
  });

  it('omits a zero/absent Retry-After rather than printing "retry in 0s"', () => {
    expect(errorHints({ code: 'NOT_FOUND', retryAfterMs: 0 }).join('\n')).not.toContain('retry in');
    expect(errorHints({ code: 'NOT_FOUND', retryAfterMs: null }).join('\n')).not.toContain('retry in');
  });

  it('rounds a sub-second Retry-After up to 1s', () => {
    expect(errorHints({ retryAfterMs: 200 }).join('\n')).toContain('1s');
  });
});

describe('benchmarks, reason codes, trust summary and the book query', () => {
  it('benchmarks is public — no key needed', async () => {
    const ctx = makeCtx();
    expect(await runCli(['benchmarks'], ctx)).toBe(0);
    expect(ctx.client.getBenchmarks).toHaveBeenCalledWith();
    expect(JSON.parse(ctx.lines[0]).kAnonymity.minimumCohortSize).toBe(20);
  });

  it('reason-codes is public — no key needed', async () => {
    const ctx = makeCtx();
    expect(await runCli(['reason-codes'], ctx)).toBe(0);
    expect(ctx.client.getReasonCodes).toHaveBeenCalledWith();
  });

  it('trust-summary passes the key and defaults narrative off', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['trust-summary', 'u1'], ctx)).toBe(0);
    expect(ctx.client.getTrustSummary).toHaveBeenCalledWith('u1', 'k', { narrative: false });
  });

  it('trust-summary --narrative sets the flag', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['trust-summary', 'u1', '--narrative'], ctx)).toBe(0);
    expect(ctx.client.getTrustSummary).toHaveBeenCalledWith('u1', 'k', { narrative: true });
  });

  it('trust-summary needs a key', async () => {
    const ctx = makeCtx();
    expect(await runCli(['trust-summary', 'u1'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('CREDDA_API_KEY');
    expect(ctx.client.getTrustSummary).not.toHaveBeenCalled();
  });

  it('benchmark passes the optional dimension through', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['benchmark', 'u1', '--dimension', 'tenureBand'], ctx)).toBe(0);
    expect(ctx.client.getUserBenchmark).toHaveBeenCalledWith('u1', 'k', { dimension: 'tenureBand' });
  });

  it('benchmark without a dimension leaves it undefined', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['benchmark', 'u1'], ctx)).toBe(0);
    expect(ctx.client.getUserBenchmark).toHaveBeenCalledWith('u1', 'k', { dimension: undefined });
  });

  it('benchmark requires a userId', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['benchmark'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('userId');
  });

  it('distribution passes dimension + cohort', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['distribution', '--dimension', 'subjectType', '--cohort', 'AGENT'], ctx)).toBe(0);
    expect(ctx.client.getBenchmarkDistribution).toHaveBeenCalledWith('k', {
      dimension: 'subjectType',
      cohort: 'AGENT',
    });
  });

  it('distribution rejects positional arguments', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['distribution', 'oops'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('no positional arguments');
    expect(ctx.client.getBenchmarkDistribution).not.toHaveBeenCalled();
  });

  it('users maps every filter flag onto the query', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(
        [
          'users',
          '--score-min', '40', '--score-max', '90',
          '--band', 'Good',
          '--subject-type', 'PERSON',
          '--active-since', '2026-01-01T00:00:00Z',
          '--verified',
          '--min-verified', '2',
          '--sort', 'score', '--order', 'desc',
          '--limit', '50', '--cursor', 'cur_1',
        ],
        ctx,
      ),
    ).toBe(0);
    expect(ctx.client.listUsers).toHaveBeenCalledWith('k', {
      scoreMin: 40,
      scoreMax: 90,
      band: 'Good',
      subjectType: 'PERSON',
      activeSince: '2026-01-01T00:00:00Z',
      minVerifiedEvents: 2,
      sort: 'score',
      order: 'desc',
      limit: 50,
      cursor: 'cur_1',
      hasVerifiedEvents: true,
    });
  });

  it('users with no flags sends an all-undefined query (no filters)', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['users'], ctx)).toBe(0);
    const query = (ctx.client.listUsers as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1];
    expect(query).not.toHaveProperty('hasVerifiedEvents');
    expect(Object.values(query as Record<string, unknown>).every((v) => v === undefined)).toBe(true);
  });

  it('users maps the scored/unscored/frozen switches and the registration window', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(
        ['users', '--unscored', '--frozen', '--subject-type', 'ORGANIZATION',
         '--registered-since', '2026-01-01', '--registered-before', '2026-07-01'],
        ctx,
      ),
    ).toBe(0);
    const query = (ctx.client.listUsers as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as Record<string, unknown>;
    // `false` must survive — it is a filter value, not an absent one.
    expect(query.hasScore).toBe(false);
    expect(query.scoreFrozen).toBe(true);
    expect(query.subjectType).toBe('ORGANIZATION');
    expect(query.registeredSince).toBe('2026-01-01');
    expect(query.registeredBefore).toBe('2026-07-01');
  });

  it('users refuses --scored and --unscored together rather than picking one', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['users', '--scored', '--unscored'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('opposites');
  });

  it('book-summary sizes a segment with the same closed filter set', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['book-summary', '--band', 'Good', '--verified'], ctx)).toBe(0);
    const [key, query] = (ctx.client.getBookSummary as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(key).toBe('k');
    expect(query).toMatchObject({ band: 'Good', hasVerifiedEvents: true });
    // A summary has no page — paging flags are not part of its vocabulary.
    expect(query).not.toHaveProperty('limit');
    expect(query).not.toHaveProperty('cursor');
  });

  it('book-summary rejects positional arguments and needs a key', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['book-summary', 'oops'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('no positional arguments');

    const noKey = makeCtx();
    expect(await runCli(['book-summary'], noKey)).toBe(1);
    expect(noKey.errors[0]).toContain('CREDDA_API_KEY');
  });

  it('users rejects positional arguments and needs a key', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['users', 'oops'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('no positional arguments');

    const noKey = makeCtx();
    expect(await runCli(['users'], noKey)).toBe(1);
    expect(noKey.errors[0]).toContain('CREDDA_API_KEY');
  });

  it('help documents the new commands', async () => {
    const ctx = makeCtx();
    await runCli(['help'], ctx);
    const help = ctx.lines.join('\n');
    for (const cmd of ['credda benchmarks', 'credda reason-codes', 'credda trust-summary', 'credda benchmark', 'credda distribution', 'credda users', 'credda book-summary']) {
      expect(help).toContain(cmd);
    }
  });
});

describe('confirmation requests', () => {
  it('create maps every flag onto the request and warns the token is shown once', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(
        [
          'confirmations', 'create',
          '--user', 'worker_7',
          '--type', 'CONTRACT_FULFILLED',
          '--counterparty', 'client_42',
          '--counterparty-name', 'Acme Ltd',
          '--description', 'Kitchen refit',
          '--stake', 'HIGH',
          '--value', '1200',
          '--due', '2026-07-20T00:00:00Z',
          '--completed', '2026-07-19T00:00:00Z',
          '--return-url', 'https://acme.example/thanks',
          '--expires-in', '14',
          '--idempotency-key', 'job-991',
        ],
        ctx,
      ),
    ).toBe(0);
    expect(ctx.client.createConfirmationRequest).toHaveBeenCalledWith(
      {
        userId: 'worker_7',
        eventType: 'CONTRACT_FULFILLED',
        counterpartyRef: 'client_42',
        counterpartyName: 'Acme Ltd',
        description: 'Kitchen refit',
        stakeLevel: 'HIGH',
        transactionValue: 1200,
        dueDate: '2026-07-20T00:00:00Z',
        completedAt: '2026-07-19T00:00:00Z',
        returnUrl: 'https://acme.example/thanks',
        expiresInDays: 14,
      },
      'k',
      { idempotencyKey: 'job-991' },
    );
    expect(ctx.errors.join('\n')).toContain('shown ONCE');
    expect(JSON.parse(ctx.lines[0]).confirmUrl).toContain('/confirm/cnf_1');
  });

  it('create refuses without --user / --type / --counterparty', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['confirmations', 'create', '--user', 'w1'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('--counterparty');
    expect(ctx.client.createConfirmationRequest).not.toHaveBeenCalled();
  });

  it('list/get/cancel are keyed and route through', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['confirmations', 'list', '--status', 'pending', '--limit', '5', '--cursor', 'c0'], ctx)).toBe(0);
    // The status is normalised — the API stores it upper-case.
    expect(ctx.client.listConfirmations).toHaveBeenCalledWith('k', { limit: 5, cursor: 'c0', status: 'PENDING' });

    expect(await runCli(['confirmations', 'get', 'cnf_1'], ctx)).toBe(0);
    expect(ctx.client.getConfirmation).toHaveBeenCalledWith('cnf_1', 'k');

    expect(await runCli(['confirmations', 'cancel', 'cnf_1'], ctx)).toBe(0);
    expect(ctx.client.cancelConfirmation).toHaveBeenCalledWith('cnf_1', 'k');
  });

  it('preview works with NO API key — the token is the capability', async () => {
    const ctx = makeCtx(); // deliberately keyless
    expect(await runCli(['confirmations', 'preview', 'cnf_1', '--token', 'raw_token'], ctx)).toBe(0);
    expect(ctx.client.previewConfirmation).toHaveBeenCalledWith('cnf_1', 'raw_token');
    expect(ctx.errors.join('\n')).not.toContain('CREDDA_API_KEY');
  });

  it('respond --confirm works with NO API key and returns the written event', async () => {
    const ctx = makeCtx(); // deliberately keyless
    expect(await runCli(['confirmations', 'respond', 'cnf_1', '--token', 'raw_token', '--confirm'], ctx)).toBe(0);
    expect(ctx.client.respondToConfirmation).toHaveBeenCalledWith('cnf_1', 'raw_token', 'confirm');
    expect(ctx.errors.join('\n')).not.toContain('CREDDA_API_KEY');
    expect(JSON.parse(ctx.lines[0]).eventId).toBe('ev_1');
  });

  it('respond --decline sends the decline decision', async () => {
    const ctx = makeCtx();
    expect(await runCli(['confirmations', 'respond', 'cnf_1', '--token', 't', '--decline'], ctx)).toBe(0);
    expect(ctx.client.respondToConfirmation).toHaveBeenCalledWith('cnf_1', 't', 'decline');
  });

  it('respond refuses an ambiguous or missing decision — confirming is never the default', async () => {
    const both = makeCtx();
    expect(await runCli(['confirmations', 'respond', 'cnf_1', '--token', 't', '--confirm', '--decline'], both)).toBe(1);
    expect(both.errors.at(-1)).toContain('exactly one of --confirm or --decline');

    const neither = makeCtx();
    expect(await runCli(['confirmations', 'respond', 'cnf_1', '--token', 't'], neither)).toBe(1);
    expect(neither.errors.at(-1)).toContain('exactly one of --confirm or --decline');
    expect(neither.client.respondToConfirmation).not.toHaveBeenCalled();
  });

  it('preview/respond still need the token', async () => {
    const ctx = makeCtx();
    expect(await runCli(['confirmations', 'preview', 'cnf_1'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('--token');
  });

  it('batch reads a JSON array from a file and bulk-creates, keyed', async () => {
    const ctx = makeCtx({
      apiKey: 'k',
      readInput: vi.fn().mockResolvedValue(JSON.stringify([
        { userId: 'u1', eventType: 'CONTRACT_FULFILLED', counterpartyRef: 'c1' },
        { userId: 'u2', eventType: 'CONTRACT_FULFILLED', counterpartyRef: 'u2' },
      ])),
    });
    expect(await runCli(['confirmations', 'batch', 'book.json', '--idempotency-key', 'warm-1'], ctx)).toBe(0);
    expect(ctx.readInput).toHaveBeenCalledWith('book.json');
    expect(ctx.client.createConfirmationBatch).toHaveBeenCalledWith(
      [
        { userId: 'u1', eventType: 'CONTRACT_FULFILLED', counterpartyRef: 'c1' },
        { userId: 'u2', eventType: 'CONTRACT_FULFILLED', counterpartyRef: 'u2' },
      ],
      'k',
      { idempotencyKey: 'warm-1' },
    );
    // partial-success result is shown; the once-only token warning goes to stderr
    expect(JSON.parse(ctx.lines[0]).created).toBe(1);
    expect(ctx.errors.join('\n')).toContain('shown ONCE');
  });

  it('batch also accepts a { requests: [...] } envelope', async () => {
    const ctx = makeCtx({
      apiKey: 'k',
      readInput: vi.fn().mockResolvedValue(JSON.stringify({
        requests: [{ userId: 'u1', eventType: 'CONTRACT_FULFILLED', counterpartyRef: 'c1' }],
      })),
    });
    expect(await runCli(['confirmations', 'batch', 'book.json'], ctx)).toBe(0);
    expect(ctx.client.createConfirmationBatch).toHaveBeenCalledWith(
      [{ userId: 'u1', eventType: 'CONTRACT_FULFILLED', counterpartyRef: 'c1' }],
      'k',
      {},
    );
  });

  it('batch rejects a file that is neither an array nor a requests envelope', async () => {
    const ctx = makeCtx({ apiKey: 'k', readInput: vi.fn().mockResolvedValue('{"foo":1}') });
    expect(await runCli(['confirmations', 'batch', 'book.json'], ctx)).toBe(1);
    expect(ctx.client.createConfirmationBatch).not.toHaveBeenCalled();
  });

  it('batch needs a key', async () => {
    const ctx = makeCtx({ readInput: vi.fn().mockResolvedValue('[]') });
    expect(await runCli(['confirmations', 'batch', 'book.json'], ctx)).toBe(1);
    expect(ctx.client.createConfirmationBatch).not.toHaveBeenCalled();
  });

  it('unknown subcommand exits 1', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['confirmations', 'frob'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('unknown confirmations subcommand');
  });
});

describe('reliability-report', () => {
  it('is keyed by default and forwards recent + benchmark options', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['reliability-report', 'worker_7', '--recent', '5', '--benchmark'], ctx)).toBe(0);
    expect(ctx.client.getReliabilityReport).toHaveBeenCalledWith('worker_7', 'k', { recent: 5, benchmark: true });
  });

  it('sends no options when none are given', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['reliability-report', 'worker_7'], ctx)).toBe(0);
    expect(ctx.client.getReliabilityReport).toHaveBeenCalledWith('worker_7', 'k', {});
  });

  it('--token is the PUBLIC worker-consent route with NO key', async () => {
    const ctx = makeCtx(); // deliberately keyless
    expect(await runCli(['reliability-report', '--token', 'tok_1', '--recent', '3'], ctx)).toBe(0);
    expect(ctx.client.getPublicReliabilityReport).toHaveBeenCalledWith('tok_1', { recent: 3 });
    expect(ctx.client.getReliabilityReport).not.toHaveBeenCalled();
    expect(ctx.errors.join('\n')).not.toContain('CREDDA_API_KEY');
  });

  it('the keyed path needs a key', async () => {
    const ctx = makeCtx(); // keyless
    expect(await runCli(['reliability-report', 'worker_7'], ctx)).toBe(1);
    expect(ctx.client.getReliabilityReport).not.toHaveBeenCalled();
  });
});

describe('reference requests', () => {
  it('create maps every flag onto the request and warns the token is shown once', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(
        [
          'references', 'create',
          '--user', 'worker_7',
          '--category', 'employment',
          '--counterparty', 'manager_42',
          '--label', 'Senior Engineer',
          '--issuer', 'Acme Ltd',
          '--jurisdiction', 'US-CA',
          '--reference', 'EMP-9910',
          '--counterparty-name', 'Dana Lee',
          '--description', 'Two years, backend team',
          '--return-url', 'https://acme.example/thanks',
          '--expires-in', '14',
          '--idempotency-key', 'ref-991',
        ],
        ctx,
      ),
    ).toBe(0);
    expect(ctx.client.createReferenceRequest).toHaveBeenCalledWith(
      {
        userId: 'worker_7',
        category: 'employment',
        counterpartyRef: 'manager_42',
        label: 'Senior Engineer',
        issuer: 'Acme Ltd',
        jurisdiction: 'US-CA',
        reference: 'EMP-9910',
        counterpartyName: 'Dana Lee',
        description: 'Two years, backend team',
        returnUrl: 'https://acme.example/thanks',
        expiresInDays: 14,
      },
      'k',
      { idempotencyKey: 'ref-991' },
    );
    expect(ctx.errors.join('\n')).toContain('shown ONCE');
    expect(JSON.parse(ctx.lines[0]).referenceUrl).toContain('/reference/rf_1');
  });

  it('create refuses without --user / --category / --counterparty', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['references', 'create', '--user', 'w1'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('--category');
    expect(ctx.client.createReferenceRequest).not.toHaveBeenCalled();
  });

  it('list/get/cancel are keyed and route through', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['references', 'list', '--status', 'pending', '--limit', '5', '--cursor', 'c0'], ctx)).toBe(0);
    // The status is normalised — the API stores it upper-case.
    expect(ctx.client.listReferences).toHaveBeenCalledWith('k', { limit: 5, cursor: 'c0', status: 'PENDING' });

    expect(await runCli(['references', 'get', 'rf_1'], ctx)).toBe(0);
    expect(ctx.client.getReference).toHaveBeenCalledWith('rf_1', 'k');

    expect(await runCli(['references', 'cancel', 'rf_1'], ctx)).toBe(0);
    expect(ctx.client.cancelReference).toHaveBeenCalledWith('rf_1', 'k');
  });

  it('preview works with NO API key — the token is the capability', async () => {
    const ctx = makeCtx(); // deliberately keyless
    expect(await runCli(['references', 'preview', 'rf_1', '--token', 'raw_token'], ctx)).toBe(0);
    expect(ctx.client.previewReference).toHaveBeenCalledWith('rf_1', 'raw_token');
    expect(ctx.errors.join('\n')).not.toContain('CREDDA_API_KEY');
  });

  it('respond --confirm works with NO API key and returns the recorded event', async () => {
    const ctx = makeCtx(); // deliberately keyless
    expect(await runCli(['references', 'respond', 'rf_1', '--token', 'raw_token', '--confirm'], ctx)).toBe(0);
    expect(ctx.client.respondToReference).toHaveBeenCalledWith('rf_1', 'raw_token', 'confirm');
    expect(ctx.errors.join('\n')).not.toContain('CREDDA_API_KEY');
    expect(JSON.parse(ctx.lines[0]).eventId).toBe('ev_1');
  });

  it('respond --decline sends the decline decision', async () => {
    const ctx = makeCtx();
    expect(await runCli(['references', 'respond', 'rf_1', '--token', 't', '--decline'], ctx)).toBe(0);
    expect(ctx.client.respondToReference).toHaveBeenCalledWith('rf_1', 't', 'decline');
  });

  it('respond refuses an ambiguous or missing decision — confirming is never the default', async () => {
    const both = makeCtx();
    expect(await runCli(['references', 'respond', 'rf_1', '--token', 't', '--confirm', '--decline'], both)).toBe(1);
    expect(both.errors.at(-1)).toContain('exactly one of --confirm or --decline');

    const neither = makeCtx();
    expect(await runCli(['references', 'respond', 'rf_1', '--token', 't'], neither)).toBe(1);
    expect(neither.errors.at(-1)).toContain('exactly one of --confirm or --decline');
    expect(neither.client.respondToReference).not.toHaveBeenCalled();
  });

  it('preview/respond still need the token', async () => {
    const ctx = makeCtx();
    expect(await runCli(['references', 'preview', 'rf_1'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('--token');
  });

  it('unknown subcommand exits 1', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['references', 'frob'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('unknown references subcommand');
  });
});

describe('threshold policies', () => {
  it('create builds a subject-scoped score policy', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(
        ['policies', 'create', '--name', 'Watch 60', '--user', 'w1', '--metric', 'score', '--direction', 'down', '--threshold', '60'],
        ctx,
      ),
    ).toBe(0);
    expect(ctx.client.createPolicy).toHaveBeenCalledWith(
      { name: 'Watch 60', metric: 'score', userId: 'w1', direction: 'down', threshold: 60 },
      'k',
    );
  });

  it('create builds an --all band policy', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(['policies', 'create', '--name', 'Any High Risk', '--all', '--metric', 'band', '--direction', 'enter', '--band', 'High Risk'], ctx),
    ).toBe(0);
    expect(ctx.client.createPolicy).toHaveBeenCalledWith(
      { name: 'Any High Risk', metric: 'band', appliesToAll: true, direction: 'enter', band: 'High Risk' },
      'k',
    );
  });

  it('create refuses both or neither of --user / --all', async () => {
    const both = makeCtx({ apiKey: 'k' });
    expect(await runCli(['policies', 'create', '--name', 'n', '--metric', 'score', '--user', 'w1', '--all'], both)).toBe(1);
    expect(both.errors.at(-1)).toContain('exactly one of --user');

    const neither = makeCtx({ apiKey: 'k' });
    expect(await runCli(['policies', 'create', '--name', 'n', '--metric', 'score'], neither)).toBe(1);
    expect(neither.errors.at(-1)).toContain('exactly one of --user');
    expect(neither.client.createPolicy).not.toHaveBeenCalled();
  });

  it('list/get/update/delete route through', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['policies', 'list', '--limit', '5', '--cursor', 'p0'], ctx)).toBe(0);
    expect(ctx.client.listPolicies).toHaveBeenCalledWith('k', { limit: 5, cursor: 'p0' });

    expect(await runCli(['policies', 'get', 'pol_1'], ctx)).toBe(0);
    expect(ctx.client.getPolicy).toHaveBeenCalledWith('pol_1', 'k');

    expect(await runCli(['policies', 'update', 'pol_1', '--threshold', '55', '--deactivate'], ctx)).toBe(0);
    expect(ctx.client.updatePolicy).toHaveBeenCalledWith('pol_1', { threshold: 55, isActive: false }, 'k');

    expect(await runCli(['policies', 'delete', 'pol_1'], ctx)).toBe(0);
    expect(ctx.client.deletePolicy).toHaveBeenCalledWith('pol_1', 'k');
    expect(JSON.parse(ctx.lines.at(-1) as string)).toEqual({ deleted: true });
  });

  it('update needs at least one field, and refuses contradictory activation flags', async () => {
    const empty = makeCtx({ apiKey: 'k' });
    expect(await runCli(['policies', 'update', 'pol_1'], empty)).toBe(1);
    expect(empty.errors.at(-1)).toContain('at least one field');

    const contradictory = makeCtx({ apiKey: 'k' });
    expect(await runCli(['policies', 'update', 'pol_1', '--activate', '--deactivate'], contradictory)).toBe(1);
    expect(contradictory.errors.at(-1)).toContain('at most one of --activate');
  });

  it('needs a key', async () => {
    const ctx = makeCtx();
    expect(await runCli(['policies', 'list'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('CREDDA_API_KEY');
  });
});

describe('Open Badges, verified profile and the professional record', () => {
  it('badges list/get are public — no key needed', async () => {
    const ctx = makeCtx();
    expect(await runCli(['badges', 'list'], ctx)).toBe(0);
    expect(ctx.client.getOpenBadgeAchievements).toHaveBeenCalledWith();

    expect(await runCli(['badges', 'get', 'first-delivery'], ctx)).toBe(0);
    expect(ctx.client.getOpenBadgeAchievement).toHaveBeenCalledWith('first-delivery');
  });

  it('verified-profile reads the measure with the key', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['verified-profile', 'u1'], ctx)).toBe(0);
    expect(ctx.client.getVerifiedProfile).toHaveBeenCalledWith('u1', 'k');
  });

  it('qualify records a claim and passes the witness through', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(
      await runCli(
        ['qualify', 'u1', '--category', 'certification', '--label', 'AWS SA', '--issuer', 'AWS', '--verified-by', 'aws-training'],
        ctx,
      ),
    ).toBe(0);
    expect(ctx.client.recordQualification).toHaveBeenCalledWith(
      'u1',
      { category: 'certification', label: 'AWS SA', issuer: 'AWS', verifiedBy: 'aws-training' },
      'k',
    );
  });

  it('qualify with no witness still records the claim (the API downgrades it, the CLI does not block)', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['qualify', 'u1', '--category', 'skill', '--label', 'TypeScript'], ctx)).toBe(0);
    expect(ctx.client.recordQualification).toHaveBeenCalledWith(
      'u1',
      { category: 'skill', label: 'TypeScript', issuer: undefined, verifiedBy: undefined },
      'k',
    );
  });

  it('qualify requires --category', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['qualify', 'u1'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('--category');
    expect(ctx.client.recordQualification).not.toHaveBeenCalled();
  });

  it('professional-record get/credential are keyed; public is not', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['professional-record', 'get', 'u1'], ctx)).toBe(0);
    expect(ctx.client.getProfessionalRecord).toHaveBeenCalledWith('u1', 'k');

    expect(await runCli(['professional-record', 'credential', 'u1', '--ttl', '3600'], ctx)).toBe(0);
    expect(ctx.client.mintProfessionalRecordCredential).toHaveBeenCalledWith('u1', 'k', { ttlSeconds: 3600 });

    const keyless = makeCtx();
    expect(await runCli(['professional-record', 'public', 'tok_1'], keyless)).toBe(0);
    expect(keyless.client.getPublicProfessionalRecord).toHaveBeenCalledWith('tok_1');
    expect(keyless.errors.join('\n')).not.toContain('CREDDA_API_KEY');
  });

  it('professional-record credential without --ttl sends no options', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['professional-record', 'credential', 'u1'], ctx)).toBe(0);
    expect(ctx.client.mintProfessionalRecordCredential).toHaveBeenCalledWith('u1', 'k', {});
  });

  it('career-export is keyed by default; --token is the PUBLIC route with no key', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['career-export', 'u1'], ctx)).toBe(0);
    expect(ctx.client.getCareerExport).toHaveBeenCalledWith('u1', 'k');

    const keyless = makeCtx();
    expect(await runCli(['career-export', '--token', 'tok_1'], keyless)).toBe(0);
    expect(keyless.client.getPublicCareerExport).toHaveBeenCalledWith('tok_1');
    // The token is the capability — the public route must never demand a key.
    expect(keyless.client.getCareerExport).not.toHaveBeenCalled();
    expect(keyless.errors.join('\n')).not.toContain('CREDDA_API_KEY');
  });

  it('outcome-templates is public and takes an optional industry filter', async () => {
    const ctx = makeCtx();
    expect(await runCli(['outcome-templates'], ctx)).toBe(0);
    expect(ctx.client.getOutcomeTemplates).toHaveBeenCalledWith(undefined);

    const filtered = makeCtx();
    expect(await runCli(['outcome-templates', 'trades'], filtered)).toBe(0);
    expect(filtered.client.getOutcomeTemplates).toHaveBeenCalledWith('trades');
    expect(filtered.errors.join('\n')).not.toContain('CREDDA_API_KEY');
  });

  it('unknown subcommands exit 1', async () => {
    const ctx = makeCtx({ apiKey: 'k' });
    expect(await runCli(['badges', 'frob'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('unknown badges subcommand');
    expect(await runCli(['professional-record', 'frob'], ctx)).toBe(1);
    expect(ctx.errors.at(-1)).toContain('unknown professional-record subcommand');
  });

  it('help documents the confirmation, policy and record commands', async () => {
    const ctx = makeCtx();
    await runCli(['help'], ctx);
    const help = ctx.lines.join('\n');
    for (const cmd of [
      'credda confirmations create',
      'credda confirmations batch',
      'credda confirmations respond',
      'credda references create',
      'credda references respond',
      'credda policies create',
      'credda badges list',
      'credda verified-profile',
      'credda qualify',
      'credda professional-record get',
      'credda reliability-report',
      'credda career-export',
      'credda outcome-templates',
    ]) {
      expect(help).toContain(cmd);
    }
  });
});

describe('quickstart — the one-command start', () => {
  it('seeds, prints a readable table, and reads one subject back', async () => {
    const ctx = makeCtx({ apiKey: 'crd_test_abc' });
    expect(await runCli(['quickstart'], ctx)).toBe(0);
    expect(ctx.client.seedSandbox).toHaveBeenCalledWith('crd_test_abc');
    const out = ctx.lines.join('\n');
    // A table a person can read, not a JSON dump.
    expect(out).toContain('SUBJECT');
    expect(out).toContain('sbx_reliable_courier');
    expect(out).toContain('Excellent');
    // It proves an ordinary keyed read works, using the same call an
    // integration makes.
    expect(ctx.client.getScore).toHaveBeenCalledWith('sbx_reliable_courier', 'crd_test_abc');
    expect(out).toContain('Next:');
  });

  // The whole point of the command. Reading a seeded score proves the wiring;
  // a counterparty-confirmed outcome is the product, and a developer used to be
  // able to finish the entire on-ramp without ever meeting POST /confirmations.
  it('closes the counterparty-confirmation loop and ends on a VERIFIED event', async () => {
    const ctx = makeCtx({ apiKey: 'crd_test_abc' });
    expect(await runCli(['quickstart'], ctx)).toBe(0);

    // Propose — with the platform key.
    expect(ctx.client.createConfirmationRequest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'sbx_confirmation_demo', eventType: 'CONTRACT_FULFILLED' }),
      'crd_test_abc',
    );
    // The subject can never be its own witness — the counterparty ref must differ.
    const [input] = (ctx.client.createConfirmationRequest as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(input.counterpartyRef).not.toBe(input.userId);

    // Preview + respond are the COUNTERPARTY's calls: token only, never a key.
    expect(ctx.client.previewConfirmation).toHaveBeenCalledWith('cnf_1', 'raw_token');
    expect(ctx.client.respondToConfirmation).toHaveBeenCalledWith('cnf_1', 'raw_token', 'confirm');

    const out = ctx.lines.join('\n');
    expect(out).toContain('ev_1');          // the verified ledger event it earned
    expect(out).toContain('isVerified');
  });

  it('--no-confirm stops after the seed and writes no confirmation', async () => {
    const ctx = makeCtx({ apiKey: 'crd_test_abc' });
    expect(await runCli(['quickstart', '--no-confirm'], ctx)).toBe(0);
    expect(ctx.client.seedSandbox).toHaveBeenCalled();
    expect(ctx.client.createConfirmationRequest).not.toHaveBeenCalled();
    expect(ctx.client.respondToConfirmation).not.toHaveBeenCalled();
  });

  it('refuses a LIVE key locally, with the exact next step', async () => {
    const ctx = makeCtx({ apiKey: 'crd_live_abc' });
    expect(await runCli(['quickstart'], ctx)).toBe(1);
    expect(ctx.client.seedSandbox).not.toHaveBeenCalled();
    const err = ctx.errors.join('\n');
    expect(err).toContain('SANDBOX key');
    expect(err).toContain('/console');
  });

  it('needs a key at all', async () => {
    const ctx = makeCtx();
    expect(await runCli(['quickstart'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('CREDDA_API_KEY');
  });
});

describe('sandbox seed/reset', () => {
  it('seeds with a sandbox key', async () => {
    const ctx = makeCtx({ apiKey: 'crd_test_abc' });
    expect(await runCli(['sandbox', 'seed'], ctx)).toBe(0);
    expect(JSON.parse(ctx.lines.join('\n'))).toMatchObject({ seeded: true, livemode: false });
  });

  it('resets with a sandbox key', async () => {
    const ctx = makeCtx({ apiKey: 'crd_test_abc' });
    expect(await runCli(['sandbox', 'reset'], ctx)).toBe(0);
    expect(ctx.client.resetSandbox).toHaveBeenCalledWith('crd_test_abc');
  });

  it('never resets with a live key', async () => {
    const ctx = makeCtx({ apiKey: 'crd_live_abc' });
    expect(await runCli(['sandbox', 'reset'], ctx)).toBe(1);
    expect(ctx.client.resetSandbox).not.toHaveBeenCalled();
  });

  it('rejects an unknown subcommand', async () => {
    const ctx = makeCtx({ apiKey: 'crd_test_abc' });
    expect(await runCli(['sandbox', 'nuke'], ctx)).toBe(1);
    expect(ctx.errors[0]).toContain('unknown sandbox subcommand');
  });
});
