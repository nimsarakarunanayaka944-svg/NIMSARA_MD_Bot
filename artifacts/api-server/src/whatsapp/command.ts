export const PREFIX = process.env["PREFIX"] || ".";

export interface CommandInfo {
  pattern: string;
  alias?: string[];
  desc?: string;
  category?: string;
  react?: string;
}

export type CommandHandler = (
  conn: unknown,
  msg: unknown,
  ctx: Record<string, unknown>
) => Promise<void>;

interface RegisteredCommand extends CommandInfo {
  handler: CommandHandler;
}

const commands: RegisteredCommand[] = [];

export function cmd(info: CommandInfo, handler: CommandHandler): void {
  commands.push({ ...info, handler });
}

export function getCommands(): RegisteredCommand[] {
  return commands;
}

export function findCommand(
  text: string
): { command: RegisteredCommand; args: string[] } | null {
  if (!text) return null;

  // Strip prefix if present, otherwise try without prefix too
  const stripped = text.startsWith(PREFIX) ? text.slice(PREFIX.length).trim() : text.trim();
  const parts = stripped.split(/\s+/);
  const pattern = parts[0]!.toLowerCase();
  const args = parts.slice(1);

  if (!pattern) return null;

  for (const c of commands) {
    const aliases = [c.pattern, ...(c.alias || [])];
    if (aliases.includes(pattern)) return { command: c, args };
  }
  return null;
}

export function findRawCommand(
  pattern: string
): RegisteredCommand | null {
  for (const c of commands) {
    const aliases = [c.pattern, ...(c.alias || [])];
    if (aliases.includes(pattern)) return c;
  }
  return null;
}
