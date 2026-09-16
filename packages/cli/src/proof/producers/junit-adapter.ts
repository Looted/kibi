import { SaxesParser } from "saxes";
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
  /** A malformed or ambiguous report must never be projected partially. */
  fatal?: boolean;
}>;

type XmlNode = {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: XmlNode[];
};

type BindingValue = { symbol_id: string; target: string };
type BindingIndex = Readonly<{
  readonly values: ReadonlyMap<string, BindingValue>;
  readonly ambiguous: ReadonlySet<string>;
}>;

/** Build a tree from SAX events so nested suites/cases cannot be confused by regex boundaries. */
function parseXml(xml: string): XmlNode {
  const parser = new SaxesParser({ xmlns: false as const });
  const stack: XmlNode[] = [];
  let root: XmlNode | null = null;
  let parserError: Error | null = null;
  parser.on("doctype", () => {
    throw new Error("DTD is not accepted in JUnit reports");
  });
  parser.on("error", (error) => {
    parserError ??= error;
  });
  parser.on("opentag", (tag) => {
    const attributes: Record<string, string> = {};
    for (const [name, value] of Object.entries(tag.attributes)) {
      attributes[name] = typeof value === "string" ? value : String(value);
    }
    stack.push({ name: tag.name, attributes, children: [] });
  });
  parser.on("closetag", () => {
    const node = stack.pop();
    if (!node) {
      parserError ??= new Error("unexpected XML closing tag");
      return;
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else if (root) parserError ??= new Error("multiple XML root elements");
    else root = node;
  });
  try {
    parser.write(xml).close();
  } catch (error) {
    parserError ??= error instanceof Error ? error : new Error(String(error));
  }
  if (parserError) throw parserError;
  if (stack.length > 0)
    throw new Error(`unclosed XML element <${stack[stack.length - 1]?.name}>`);
  if (!root) throw new Error("empty XML report");
  return root;
}

function bindingIndex(bindings: readonly NativeBinding[]): BindingIndex {
  const values = new Map<string, BindingValue>();
  const ambiguous = new Set<string>();
  for (const binding of bindings) {
    const value = { symbol_id: binding.symbol_id, target: binding.target };
    for (const nativeId of [binding.native_id, ...(binding.aliases ?? [])]) {
      if (!nativeId) continue;
      const previous = values.get(nativeId);
      if (
        previous &&
        (previous.symbol_id !== value.symbol_id ||
          previous.target !== value.target)
      ) {
        ambiguous.add(nativeId);
        continue;
      }
      values.set(nativeId, value);
    }
  }
  return { values, ambiguous };
}

// implements REQ-kibi-verification-evidence-contract
export function ambiguousNativeBindings(
  bindings: readonly NativeBinding[],
): readonly string[] {
  return [...bindingIndex(bindings).ambiguous];
}

// implements REQ-kibi-verification-evidence-contract
export function bindingLookup(
  bindings: readonly NativeBinding[],
): (nativeId: string) => { symbol_id: string; target: string } | null {
  const index = bindingIndex(bindings);
  return (nativeId: string) =>
    index.ambiguous.has(nativeId) ? null : (index.values.get(nativeId) ?? null);
}

function descendants(node: XmlNode, name: string): XmlNode[] {
  const found: XmlNode[] = [];
  for (const child of node.children) {
    if (child.name === name) found.push(child);
    found.push(...descendants(child, name));
  }
  return found;
}

function outcomeFromJUnitCase(testcase: XmlNode): {
  outcome: ProofResult["outcome"];
  reruns: number;
} {
  const hasFailure =
    descendants(testcase, "failure").length > 0 ||
    descendants(testcase, "error").length > 0;
  const hasSkipped = descendants(testcase, "skipped").length > 0;
  const reruns =
    descendants(testcase, "rerunFailure").length +
    descendants(testcase, "rerunError").length;
  if (hasSkipped && !hasFailure) return { outcome: "skipped", reruns };
  if (hasFailure) return { outcome: "failed", reruns };
  return { outcome: "passed", reruns };
}

/**
 * JUnit XML exposes native case outcomes but no trustworthy attempt history.
 * Explicit rerunFailure/rerunError children are the only exception: they
 * provide a complete failed-then-passed sequence. Plain passes remain
 * unavailable and are rejected by the strict first-attempt evaluator.
 */
// implements REQ-kibi-verification-evidence-contract
export function convertJUnitXml(
  xml: string,
  bindings: readonly NativeBinding[],
): NativeConversion {
  const index = bindingIndex(bindings);
  const diagnostics: string[] = [];
  let root: XmlNode;
  try {
    root = parseXml(xml);
  } catch (error) {
    diagnostics.push(
      `malformed junit XML: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (!/<testsuite\b/i.test(xml))
      diagnostics.push("no <testsuite> element found; not a JUnit XML report");
    return { results: [], diagnostics, fatal: true };
  }
  if (root.name !== "testsuite" && root.name !== "testsuites") {
    diagnostics.push("no <testsuite> element found; not a JUnit XML report");
    return { results: [], diagnostics, fatal: true };
  }
  for (const nativeId of index.ambiguous)
    diagnostics.push(`ambiguous junit binding for ${nativeId}`);
  let fatal = index.ambiguous.size > 0;
  const results: ProofResult[] = [];
  const seen = new Map<
    string,
    { nativeId: string; outcome: ProofResult["outcome"] }
  >();
  for (const testcase of descendants(root, "testcase")) {
    const name = testcase.attributes.name;
    if (name === undefined) continue;
    const classname = testcase.attributes.classname;
    const nativeId = classname ? `${classname}::${name}` : name;
    if (index.ambiguous.has(nativeId)) continue;
    const bound = index.values.get(nativeId);
    if (!bound) {
      diagnostics.push(`unbound junit testcase ignored: ${nativeId}`);
      continue;
    }
    const key = `${bound.target}\0${bound.symbol_id}`;
    const { outcome, reruns } = outcomeFromJUnitCase(testcase);
    const previous = seen.get(key);
    if (previous) {
      if (previous.nativeId !== nativeId || previous.outcome !== outcome) {
        diagnostics.push(`ambiguous duplicate junit result for ${nativeId}`);
        fatal = true;
      } else {
        diagnostics.push(`duplicate junit result for ${nativeId}; ignored`);
      }
      continue;
    }
    seen.set(key, { nativeId, outcome });
    const time = testcase.attributes.time;
    const durationMs =
      time !== undefined && Number.isFinite(Number(time))
        ? Math.max(0, Math.round(Number(time) * 1000))
        : undefined;
    results.push({
      symbol_id: bound.symbol_id,
      target: bound.target,
      outcome,
      binding: "native_case",
      native_id: nativeId,
      attempts:
        reruns > 0 && outcome === "passed"
          ? {
              status: "complete",
              entries: [
                ...Array.from({ length: reruns }, () => ({
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
  return fatal
    ? { results: [], diagnostics, fatal: true }
    : { results, diagnostics };
}
