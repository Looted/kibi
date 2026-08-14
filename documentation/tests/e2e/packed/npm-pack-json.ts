export interface NpmPackResult {
  filename: string;
  version: string;
  [key: string]: unknown;
}

/**
 * Parse `npm pack --json` while tolerating lifecycle output written before
 * npm's JSON payload (for example prepack contract and OpenCode build logs).
 */
export function parseNpmPackJsonOutput(output: string): NpmPackResult[] {
  for (let i = 0; i < output.length; i += 1) {
    if (output[i] !== "[") continue;
    const remaining = output.slice(i + 1).trimStart();
    if (!remaining.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(output.slice(i)) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.some(
          (entry) =>
            typeof entry === "object" &&
            entry !== null &&
            !Array.isArray(entry) &&
            typeof (entry as { filename?: unknown }).filename === "string",
        )
      ) {
        return parsed as NpmPackResult[];
      }
    } catch {
      // A bracketed lifecycle line is not the pack payload; keep scanning.
    }
  }
  throw new Error(`npm pack did not emit parseable JSON output: ${output}`);
}
