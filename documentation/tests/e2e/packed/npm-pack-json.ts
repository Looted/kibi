import { basename, dirname, isAbsolute, resolve } from "node:path";

export interface NpmPackResult {
  filename: string;
  version: string;
  [key: string]: unknown;
}

function isPackResult(value: unknown): value is NpmPackResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const filename = (value as { filename?: unknown }).filename;
  if (typeof filename !== "string" || filename.length === 0) return false;
  if (filename.includes("\0") || !filename.toLowerCase().endsWith(".tgz")) {
    return false;
  }

  // npm emits a basename while pnpm emits an absolute path. Reject relative
  // traversal/path injection while accepting either package-manager shape.
  return isAbsolute(filename) || basename(filename) === filename;
}

function parseJsonValueAt(output: string, start: number): unknown | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < output.length; index += 1) {
    const character = output[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") {
      depth += 1;
      continue;
    }
    if (character !== "}" && character !== "]") continue;
    depth -= 1;
    if (depth !== 0) continue;

    try {
      return JSON.parse(output.slice(start, index + 1)) as unknown;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Parse `npm pack --json` while tolerating lifecycle output written before
 * npm's JSON payload (for example prepack contract and OpenCode build logs).
 */
export function parseNpmPackJsonOutput(output: string): NpmPackResult[] {
  for (let i = 0; i < output.length; i += 1) {
    if (output[i] !== "[" && output[i] !== "{") continue;
    const parsed = parseJsonValueAt(output, i);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(isPackResult)
    ) {
      return parsed;
    }
    if (isPackResult(parsed)) return [parsed];
  }
  throw new Error(`npm pack did not emit parseable JSON output: ${output}`);
}

/** Resolve npm's basename or pnpm's absolute pack result safely. */
export function resolveNpmPackFilename(
  destination: string,
  filename: string,
): string {
  if (!isPackResult({ filename })) {
    throw new Error(`npm pack emitted an unsafe tarball filename: ${filename}`);
  }
  const resolvedDestination = resolve(destination);
  const resolvedFilename = isAbsolute(filename)
    ? resolve(filename)
    : resolve(resolvedDestination, filename);
  if (dirname(resolvedFilename) !== resolvedDestination) {
    throw new Error("npm pack emitted a tarball outside its destination");
  }
  return resolvedFilename;
}
