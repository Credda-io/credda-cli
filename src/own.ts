/**
 * A lookup that reads only what a table actually declares.
 *
 * `COMMANDS`, `GLOBAL_FLAGS` and each command's `flags` are plain object
 * literals, so `table[name]` walks the prototype chain: every member of
 * `Object.prototype` answers `!== undefined` and is accepted as a real command
 * or flag.
 *
 * That is not theoretical. Against the shipped build:
 *
 *     credda investigate --constructor ./repo
 *
 * was accepted, and the flag SWALLOWED the next token as its value — so the
 * repository path silently disappeared and the run began without it. The same
 * argv with `--nope` correctly threw "Unknown flag". `credda toString` resolved
 * as a command instead of "Unknown command", and `commandUsage('toString')`
 * then threw a TypeError rather than printing usage.
 *
 * A CLI's whole contract is that it refuses what it does not understand. This
 * makes the lookup answer for declared keys only.
 */
export function own<T>(table: Readonly<Record<string, T>>, name: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, name) ? table[name] : undefined;
}
