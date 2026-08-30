import type { ProofResult } from "../../public/proof-protocol.js";
import {
  type NativeBinding,
  type NativeConversion,
  bindingLookup,
} from "./junit-adapter.js";

function parseDirective(line: string): {
  outcome: ProofResult["outcome"];
} | null {
  if (/^ok\b/.test(line)) {
    if (/#\s*SKIP\b/i.test(line)) return { outcome: "skipped" };
    if (/#\s*TODO\b/i.test(line)) return { outcome: "skipped" };
    return { outcome: "passed" };
  }
  if (/^not ok\b/.test(line)) {
    if (/#\s*SKIP\b/i.test(line)) return { outcome: "skipped" };
    return { outcome: "failed" };
  }
  return null;
}

function testName(line: string): string {
  const withoutDirective = line.split("#")[0] ?? line;
  const match = withoutDirective.match(/^(?:not )?ok(?:\s+\d+)?\s*-?\s*(.*)$/);
  return (match?.[1] ?? "").trim();
}

/**
 * TAP converter: maps TAP assertions to bound proof symbols. Standard TAP
 * carries no retry history, so attempts are reported as unavailable.
 * Unmatched assertions are ignored per contract projection and surfaced as
 * diagnostics.
 */
export function convertTap(
  tap: string,
  bindings: readonly NativeBinding[],
): NativeConversion {
  const lookup = bindingLookup(bindings);
  const results: ProofResult[] = [];
  const diagnostics: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of tap.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("#") || line === "" || /^Bail out!/i.test(line))
      continue;
    if (/^\d+\.\.\d+/.test(line)) continue;
    const parsed = parseDirective(line);
    if (!parsed) continue;
    const nativeId = testName(line);
    if (!nativeId) continue;
    const bound = lookup(nativeId);
    if (!bound) {
      diagnostics.push(`unbound TAP assertion ignored: ${nativeId}`);
      continue;
    }
    const key = `${bound.target}\0${bound.symbol_id}`;
    if (seen.has(key)) {
      diagnostics.push(`duplicate TAP result for ${nativeId}; ignored`);
      continue;
    }
    seen.add(key);
    results.push({
      symbol_id: bound.symbol_id,
      target: bound.target,
      outcome: parsed.outcome,
      binding: "native_case",
      native_id: nativeId,
      attempts: { status: "unavailable" },
    });
  }
  return { results, diagnostics };
}
