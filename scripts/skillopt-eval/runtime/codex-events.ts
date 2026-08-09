import { createHash } from "node:crypto";
import { z } from "zod";
import type { VariantSchema } from "../contracts/episode";

const JsonObjectSchema = z.record(z.string(), z.unknown());
const UsageSchema = z
  .object({
    input_tokens: z.number().int().nonnegative().optional(),
    cached_input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const CODEX_VIOLATIONS = [
  "hidden_data_leakage",
  "direct_kb_access",
  "forbidden_write",
  "unauthorized_network",
] as const;
export type CodexViolation = (typeof CODEX_VIOLATIONS)[number];

export type NormalizedCodexEvent = Readonly<{
  sequence: number;
  type: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export type CodexNormalization = Readonly<{
  events: readonly NormalizedCodexEvent[];
  malformedLines: readonly number[];
  violations: readonly CodexViolation[];
  usage: Readonly<{
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  }>;
  empty: boolean;
}>;

export type CodexNormalizationOptions = Readonly<{
  hiddenMarkers: readonly string[];
  forbiddenRoots: readonly string[];
}>;

function redactValue(
  value: unknown,
  options: CodexNormalizationOptions,
  key = "",
): unknown {
  if (/(?:api[-_]?key|auth|credential|password|secret|token)/i.test(key)) {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
    if (options.hiddenMarkers.some((marker) => value.includes(marker))) {
      return "[REDACTED]";
    }
    if (options.forbiddenRoots.some((root) => value.includes(root))) {
      return "[PRIVATE_PATH]";
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, options));
  }
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([childKey, entry]) => [
      childKey,
      redactValue(entry, options, childKey),
    ]),
  );
}

function stringsWithKeys(
  value: unknown,
  key = "",
): readonly Readonly<{ key: string; value: string }>[] {
  if (typeof value === "string") return [{ key, value }];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => stringsWithKeys(entry, key));
  }
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([childKey, entry]) =>
    stringsWithKeys(entry, childKey),
  );
}

const KB_PATH_PATTERN = /(?:^|[\s\\/])\.kb(?:[\\/]|$)/;
const GLOB_OPTION_PATTERN =
  /(?:^|\s)(?:-g|--glob)(?:=|\s+)(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;

/**
 * A command is allowed to exclude the private KB tree while enumerating a
 * workspace.  Treat only actual `.kb` path operands as access; otherwise a
 * normal negated glob exclusion for the private tree terminates a cell before
 * the model can use the public Kibi surface.
 */
// implements REQ-skillopt-codex-optimization
function commandReferencesKb(command: string): boolean {
  // Codex's shell serializer represents an embedded quote as `'"'`.  Remove
  // only that quoting marker before parsing glob operands; the path itself is
  // preserved for the access check below.
  const normalizedCommand = command.replace(/'"'/g, "");
  const excludedRanges: Array<readonly [number, number]> = [];
  for (const match of normalizedCommand.matchAll(GLOB_OPTION_PATTERN)) {
    const glob = (match[1] ?? match[2] ?? match[3] ?? "").replace(
      /^['"]+|['"]+$/g,
      "",
    );
    if (glob.startsWith("!") && KB_PATH_PATTERN.test(glob)) {
      const start = match.index ?? 0;
      excludedRanges.push([start, start + match[0].length]);
    }
  }
  if (excludedRanges.length === 0)
    return KB_PATH_PATTERN.test(normalizedCommand);
  let offset = 0;
  let remainder = "";
  for (const [start, end] of excludedRanges) {
    remainder += normalizedCommand.slice(offset, start);
    offset = end;
  }
  remainder += normalizedCommand.slice(offset);
  return KB_PATH_PATTERN.test(remainder);
}

function eventViolations(
  event: Readonly<Record<string, unknown>>,
  options: CodexNormalizationOptions,
): readonly CodexViolation[] {
  const strings = stringsWithKeys(event);
  const violations: CodexViolation[] = [];
  if (
    strings.some(({ value }) =>
      options.hiddenMarkers.some((marker) => value.includes(marker)),
    )
  ) {
    violations.push("hidden_data_leakage");
  }
  if (
    strings.some(
      ({ key, value }) =>
        /^(?:command|path|file_path)$/i.test(key) &&
        (key.toLowerCase() === "command"
          ? commandReferencesKb(value)
          : KB_PATH_PATTERN.test(value)),
    )
  ) {
    violations.push("direct_kb_access");
  }
  if (
    strings.some(
      ({ key, value }) =>
        (/^(?:path|file_path)$/i.test(key) &&
          (value.split(/[\\/]/).includes("..") ||
            options.forbiddenRoots.some((root) => value.startsWith(root)))) ||
        (key === "command" &&
          options.forbiddenRoots.some((root) => value.includes(root)) &&
          /(?:^|\s)(?:cp|mkdir|mv|rm|tee|touch)(?:\s|$)|>/.test(value)),
    )
  ) {
    violations.push("forbidden_write");
  }
  if (
    event.type === "web_search" ||
    strings.some(
      ({ key, value }) =>
        key === "command" && /(?:^|\s)(?:curl|wget)\s/.test(value),
    )
  ) {
    violations.push("unauthorized_network");
  }
  return violations;
}

// implements REQ-skillopt-codex-optimization
export function normalizeCodexJsonl(
  stdout: string,
  options: CodexNormalizationOptions,
): CodexNormalization {
  const events: NormalizedCodexEvent[] = [];
  const malformedLines: number[] = [];
  const violations = new Set<CodexViolation>();
  let usage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
  for (const [index, line] of stdout.split("\n").entries()) {
    if (line.trim() === "") continue;
    let event: Readonly<Record<string, unknown>>;
    try {
      event = JsonObjectSchema.parse(JSON.parse(line));
    } catch (error) {
      if (!(error instanceof SyntaxError || error instanceof z.ZodError)) {
        throw error;
      }
      malformedLines.push(index + 1);
      events.push({
        sequence: events.length,
        type: "malformed",
        payload: { lineNumber: index + 1 },
      });
      continue;
    }
    for (const violation of eventViolations(event, options)) {
      violations.add(violation);
    }
    const parsedUsage = UsageSchema.safeParse(event.usage);
    if (parsedUsage.success) {
      usage = {
        inputTokens: parsedUsage.data.input_tokens ?? usage.inputTokens,
        cachedInputTokens:
          parsedUsage.data.cached_input_tokens ?? usage.cachedInputTokens,
        outputTokens: parsedUsage.data.output_tokens ?? usage.outputTokens,
      };
    }
    events.push({
      sequence: events.length,
      type: typeof event.type === "string" ? event.type : "unknown",
      payload: JsonObjectSchema.parse(redactValue(event, options)),
    });
  }
  return {
    events,
    malformedLines,
    violations: [...violations],
    usage,
    empty: events.length === 0,
  };
}

// implements REQ-skillopt-codex-optimization
export function deterministicVariantLabel(
  runLockHash: string,
  episodeId: string,
  variant: z.infer<typeof VariantSchema>,
): string {
  const digest = createHash("sha256")
    .update(`${runLockHash}\0${episodeId}\0${variant}`)
    .digest("hex")
    .slice(0, 16);
  return `variant-${digest}`;
}
