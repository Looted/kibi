import type { ProofResult } from "../../public/proof-protocol.js";

export type NativeBinding = Readonly<{
  symbol_id: string;
  target: string;
  native_id?: string;
  aliases?: readonly string[];
}>;

export type NativeConversion = Readonly<{
  results: ProofResult[];
  diagnostics: string[];
}>;

export function bindingLookup(
  bindings: readonly NativeBinding[],
): (nativeId: string) => { symbol_id: string; target: string } | null {
  const map = new Map<string, { symbol_id: string; target: string }>();
  for (const binding of bindings) {
    const value = { symbol_id: binding.symbol_id, target: binding.target };
    if (binding.native_id) map.set(binding.native_id, value);
    for (const alias of binding.aliases ?? []) map.set(alias, value);
  }
  return (nativeId: string) => map.get(nativeId) ?? null;
}

function outcomeFromJUnitCase(caseXml: string): {
  outcome: ProofResult["outcome"];
  reruns: number;
} {
  const hasFailure = /<(?:failure|error)[\s>]/.test(caseXml);
  const hasSkipped = /<skipped[\s/>]/.test(caseXml);
  const rerunMatches = caseXml.match(/<rerun(?:Failure|Error)[\s>]/g);
  const reruns = rerunMatches ? rerunMatches.length : 0;
  if (hasSkipped && !hasFailure) return { outcome: "skipped", reruns };
  if (hasFailure) return { outcome: "failed", reruns };
  return { outcome: "passed", reruns };
}

function xmlAttribute(element: string, name: string): string | null {
  const match = element.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  if (match?.[1] !== undefined) return match[1];
  const single = element.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`));
  return single?.[1] ?? null;
}

/**
 * Minimal JUnit XML converter for machine-generated reports: maps
 * testcase elements to bound proof symbols. Standard JUnit XML exposes no
 * retry history, so attempts are reported as unavailable; explicit
 * rerunFailure/rerunError elements are reported as failed earlier attempts.
 * Unmatched native results are ignored per contract projection and surfaced
 * as diagnostics.
 */
export function convertJUnitXml(
  xml: string,
  bindings: readonly NativeBinding[],
): NativeConversion {
  const lookup = bindingLookup(bindings);
  const results: ProofResult[] = [];
  const diagnostics: string[] = [];
  const seen = new Set<string>();
  const casePattern =
    /<testcase\b([\s\S]*?)\/>|<testcase\b([\s\S]*?)<\/testcase>/g;
  let match = casePattern.exec(xml);
  while (match !== null) {
    const caseXml = match[0];
    match = casePattern.exec(xml);
    const openTag = caseXml.slice(0, caseXml.indexOf(">") + 1);
    const name = xmlAttribute(openTag, "name");
    const classname =
      xmlAttribute(openTag, "classname") ?? xmlAttribute(caseXml, "classname");
    const time = xmlAttribute(openTag, "time");
    if (name === null) continue;
    const nativeId = classname ? `${classname}::${name}` : name;
    const bound = lookup(nativeId);
    if (!bound) {
      diagnostics.push(`unbound junit testcase ignored: ${nativeId}`);
      continue;
    }
    const key = `${bound.target}\0${bound.symbol_id}`;
    if (seen.has(key)) {
      diagnostics.push(`duplicate junit result for ${nativeId}; ignored`);
      continue;
    }
    seen.add(key);
    const { outcome, reruns } = outcomeFromJUnitCase(caseXml);
    const durationMs =
      time !== null && Number.isFinite(Number(time))
        ? Math.max(0, Math.round(Number(time) * 1000))
        : undefined;
    const failedAttempts = reruns;
    results.push({
      symbol_id: bound.symbol_id,
      target: bound.target,
      outcome,
      binding: "native_case",
      native_id: nativeId,
      attempts:
        failedAttempts > 0 && outcome === "passed"
          ? {
              status: "complete",
              entries: [
                ...Array.from({ length: failedAttempts }, () => ({
                  outcome: "failed" as const,
                })),
                {
                  outcome: "passed" as const,
                  ...(durationMs !== undefined
                    ? { duration_ms: durationMs }
                    : {}),
                },
              ],
            }
          : { status: "unavailable" },
    });
  }
  if (results.length === 0 && !/<testsuite[\s>]/.test(xml)) {
    diagnostics.push("no <testsuite> element found; not a JUnit XML report");
  }
  return { results, diagnostics };
}
