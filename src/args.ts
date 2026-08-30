/**
 * A small argument parser for the `credda` command surface.
 *
 * Hand-rolled deliberately: a dependency here would be a supply-chain risk
 * taken on for string parsing. The surface has outgrown the "six commands and a
 * dozen flags" this line used to claim -- it is 13 commands, 3 aliases and 27
 * flags -- and the argument holds better at that size, not worse.
 * The parser is spec-driven so `--help` is generated from the same data the
 * parser validates against and cannot drift from it.
 */

export type FlagKind = 'boolean' | 'string' | 'number';

export interface FlagSpec {
  readonly kind: FlagKind;
  readonly description: string;
  /** Single-character alias, without the leading dash. */
  readonly alias?: string;
  /** Permitted values for a string flag. */
  readonly choices?: readonly string[];
  /** Placeholder shown in help, e.g. `<n>`. */
  readonly valueName?: string;
  /** Documented default, shown in help only. Never applied by the parser. */
  readonly defaultNote?: string;
}

export interface CommandSpec {
  readonly name: string;
  readonly summary: string;
  /**
   * The argument portion of the usage line, without `credda ` or the command
   * name. Both are composed from `name`, so an alias renders its own usage
   * rather than the canonical command's.
   */
  readonly args: string;
  readonly flags: Readonly<Record<string, FlagSpec>>;
  /** Longer explanation appended to `credda <command> --help`. */
  readonly details?: readonly string[];
  /**
   * The command this one is a spelling of. Parsing and help are unchanged; only
   * dispatch resolves through it, so an alias cannot drift from its target.
   */
  readonly aliasOf?: string;
}

/** A user error: bad flag, missing value, unknown command. Never a bug. */
export class UsageError extends Error {
  constructor(
    message: string,
    /** The command whose usage should be printed, if one was identified. */
    readonly command: string | null = null,
  ) {
    super(message);
    this.name = 'UsageError';
  }
}

export interface GlobalFlags {
  readonly help: boolean;
  readonly version: boolean;
  readonly json: boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
  readonly color: boolean;
}

export type FlagValue = string | number | boolean;

export interface ParsedCommand {
  readonly command: string | null;
  readonly globals: GlobalFlags;
  readonly flags: ReadonlyMap<string, FlagValue>;
  readonly positionals: readonly string[];
}

export const GLOBAL_FLAGS: Readonly<Record<string, FlagSpec>> = {
  help: { kind: 'boolean', alias: 'h', description: 'Show help for the command and exit' },
  version: { kind: 'boolean', description: 'Print the credda version and exit' },
  json: { kind: 'boolean', description: 'Machine-readable JSONL on stdout; nothing else on stdout' },
  quiet: { kind: 'boolean', description: 'Print only the final outcome line' },
  verbose: { kind: 'boolean', description: 'Include debug-severity events' },
  'no-color': { kind: 'boolean', description: 'Disable ANSI colour (also honoured: NO_COLOR)' },
};

/**
 * Parses argv against a command table.
 *
 * `--` ends flag parsing; everything after it is positional. A bare `-` is a
 * positional (it means stdin to `credda investigate`), not a flag.
 */
export function parseArgs(
  argv: readonly string[],
  commands: Readonly<Record<string, CommandSpec>>,
): ParsedCommand {
  const globals: Record<string, boolean> = {
    help: false,
    version: false,
    json: false,
    quiet: false,
    verbose: false,
    'no-color': false,
  };
  const flags = new Map<string, FlagValue>();
  const positionals: string[] = [];

  let command: string | null = null;
  let spec: CommandSpec | null = null;
  let endOfFlags = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === undefined) continue;

    if (endOfFlags) {
      positionals.push(token);
      continue;
    }

    if (token === '--') {
      endOfFlags = true;
      continue;
    }

    if (token.startsWith('-') && token !== '-') {
      const { name, inlineValue } = splitFlag(token);
      const resolved = resolveFlag(name, spec, command);

      if (resolved.kind === 'boolean') {
        if (inlineValue !== null) {
          throw new UsageError(`The flag --${resolved.name} does not take a value.`, command);
        }
        if (resolved.global) globals[resolved.name] = true;
        else flags.set(resolved.name, true);
        continue;
      }

      let raw = inlineValue;
      if (raw === null) {
        const next = argv[i + 1];
        // A negative number is a value, not a flag: `--since -2` must reach the
        // command's own validation and produce its message, not "unknown flag".
        const looksLikeFlag =
          next !== undefined &&
          next.startsWith('-') &&
          next !== '-' &&
          !(resolved.kind === 'number' && /^-\d/.test(next));

        if (next === undefined || looksLikeFlag) {
          const placeholder = resolved.spec.valueName ?? `<${resolved.kind}>`;
          throw new UsageError(
            `The flag --${resolved.name} needs a value: --${resolved.name} ${placeholder}`,
            command,
          );
        }
        raw = next;
        i += 1;
      }

      flags.set(resolved.name, coerce(resolved.name, raw, resolved.spec, command));
      continue;
    }

    if (command === null && positionals.length === 0) {
      const found = commands[token];
      if (found !== undefined) {
        command = token;
        spec = found;
        continue;
      }
      // An unknown first word is an unknown command, not a positional.
      throw new UsageError(
        `Unknown command '${token}'. Run 'credda --help' for the list of commands.`,
        null,
      );
    }

    positionals.push(token);
  }

  return {
    command,
    globals: {
      help: globals['help'] === true,
      version: globals['version'] === true,
      json: globals['json'] === true,
      quiet: globals['quiet'] === true,
      verbose: globals['verbose'] === true,
      color: globals['no-color'] !== true,
    },
    flags,
    positionals,
  };
}

interface ResolvedFlag {
  readonly name: string;
  readonly kind: FlagKind;
  readonly spec: FlagSpec;
  readonly global: boolean;
}

function splitFlag(token: string): { name: string; inlineValue: string | null } {
  const body = token.startsWith('--') ? token.slice(2) : token.slice(1);
  const eq = body.indexOf('=');
  if (eq === -1) return { name: body, inlineValue: null };
  return { name: body.slice(0, eq), inlineValue: body.slice(eq + 1) };
}

function resolveFlag(name: string, spec: CommandSpec | null, command: string | null): ResolvedFlag {
  const commandFlags = spec?.flags ?? {};

  const direct = commandFlags[name];
  if (direct !== undefined) return { name, kind: direct.kind, spec: direct, global: false };

  const globalSpec = GLOBAL_FLAGS[name];
  if (globalSpec !== undefined) return { name, kind: globalSpec.kind, spec: globalSpec, global: true };

  for (const [key, candidate] of Object.entries(commandFlags)) {
    if (candidate.alias === name) return { name: key, kind: candidate.kind, spec: candidate, global: false };
  }
  for (const [key, candidate] of Object.entries(GLOBAL_FLAGS)) {
    if (candidate.alias === name) return { name: key, kind: candidate.kind, spec: candidate, global: true };
  }

  const known = [...Object.keys(commandFlags), ...Object.keys(GLOBAL_FLAGS)];
  const suggestion = closest(name, known);
  const where = command === null ? '' : ` for 'credda ${command}'`;
  throw new UsageError(
    `Unknown flag '--${name}'${where}.${suggestion === null ? '' : ` Did you mean '--${suggestion}'?`}`,
    command,
  );
}

function coerce(name: string, raw: string, spec: FlagSpec, command: string | null): FlagValue {
  if (spec.kind === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new UsageError(`The flag --${name} needs a number, but got '${raw}'.`, command);
    }
    return value;
  }
  if (spec.choices !== undefined && !spec.choices.includes(raw)) {
    throw new UsageError(
      `Invalid value '${raw}' for --${name}. Expected one of: ${spec.choices.join(', ')}.`,
      command,
    );
  }
  return raw;
}

/** Levenshtein-based suggestion, only offered when the edit distance is small. */
function closest(input: string, candidates: readonly string[]): string | null {
  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = editDistance(input, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return bestDistance <= Math.max(1, Math.floor(input.length / 3)) ? best : null;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i, ...new Array<number>(b.length).fill(0)];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** Reads a string flag, or null when absent. */
export function stringFlag(parsed: ParsedCommand, name: string): string | null {
  const value = parsed.flags.get(name);
  return typeof value === 'string' ? value : null;
}

/** Reads a number flag, or null when absent. */
export function numberFlag(parsed: ParsedCommand, name: string): number | null {
  const value = parsed.flags.get(name);
  return typeof value === 'number' ? value : null;
}

export function boolFlag(parsed: ParsedCommand, name: string): boolean {
  return parsed.flags.get(name) === true;
}
