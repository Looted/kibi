import type { ProofResult } from "../../public/proof-protocol.js";
import {
  type NativeBinding,
  type NativeConversion,
  ambiguousNativeBindings,
  bindingLookup,
} from "./junit-adapter.js";

type TapAssertion = Readonly<{
  outcome: ProofResult["outcome"];
  name: string;
}>;

type TapContext = {
  readonly indent: number;
  readonly path: string;
  assertions: number;
  plan?: number;
};

function splitDirective(line: string): {
  body: string;
  directive?: "SKIP" | "TODO";
} {
  const match = line.match(/\s+#\s*(SKIP|TODO)\b(?:.*)$/i);
  if (!match || match.index === undefined) return { body: line };
  return {
    body: line.slice(0, match.index).trimEnd(),
    directive: match[1]?.toUpperCase() as "SKIP" | "TODO",
  };
}

function parseAssertion(line: string): TapAssertion | null {
  const directive = splitDirective(line);
  const match = directive.body.match(
    /^(not ok|ok)\b(?:\s+\d+)?(?:\s*-?\s*(.*))?$/i,
  );
  if (!match) return null;
  const outcome: ProofResult["outcome"] =
    directive.directive === "SKIP" || directive.directive === "TODO"
      ? "skipped"
      : match[1]?.toLowerCase() === "ok"
        ? "passed"
        : "failed";
  return { outcome, name: (match[2] ?? "").trim() };
}

function parsePlan(line: string): number | null {
  const match = line.match(/^(\d+)\.\.(\d+)(?:\s+#\s*(SKIP|TODO)\b.*)?$/i);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const directive = match[3]?.toUpperCase();
  if (start === 1 && end === 0 && directive === "SKIP") return 0;
  if (start > end || (start !== 0 && start !== 1)) return -1;
  return end;
}

function indentOf(line: string): number {
  const match = line.match(/^[ \t]*/)?.[0] ?? "";
  return match.replace(/\t/g, "    ").length;
}

function nativeIdCandidates(path: string, name: string): string[] {
  if (!path) return [name];
  const full = `${path} > ${name}`;
  return full === name ? [name] : [full, name];
}

function failClosed(diagnostics: string[]): NativeConversion {
  return { results: [], diagnostics, fatal: true };
}

/**
 * TAP converter: maps assertions to bound proof symbols. Indented subtests
 * retain their `parent > child` identity, while a leaf binding remains a
 * compatibility fallback for reports that did not publish the hierarchy.
 * Plans are checked per indentation scope; bailouts, malformed plans, and
 * conflicting duplicate observations discard the whole projection.
 */
// implements REQ-kibi-verification-evidence-contract
export function convertTap(
  tap: string,
  bindings: readonly NativeBinding[],
): NativeConversion {
  const lookup = bindingLookup(bindings);
  const diagnostics: string[] = [];
  const results: ProofResult[] = [];
  const seen = new Map<
    string,
    { nativeId: string; outcome: ProofResult["outcome"] }
  >();
  const root: TapContext = { indent: -1, path: "", assertions: 0 };
  const contexts: TapContext[] = [root];
  const allContexts: TapContext[] = [root];
  let pendingSubtest: { indent: number; path: string } | null = null;
  let sawTap = false;
  let fatal = false;

  for (const rawLine of tap.split(/\r?\n/)) {
    const indent = indentOf(rawLine);
    const line = rawLine.trim();
    if (line === "") continue;

    while (
      contexts.length > 1 &&
      indent <= (contexts[contexts.length - 1]?.indent ?? -1)
    ) {
      contexts.pop();
    }

    if (/^TAP version\s+\d+$/i.test(line)) {
      sawTap = true;
      continue;
    }
    if (pendingSubtest && indent > pendingSubtest.indent) {
      const child: TapContext = {
        indent: pendingSubtest.indent,
        path: pendingSubtest.path,
        assertions: 0,
      };
      contexts.push(child);
      allContexts.push(child);
      pendingSubtest = null;
    }

    const subtest = line.match(/^#\s*Subtest:\s*(.+)$/i);
    if (subtest) {
      pendingSubtest = null;
      const parent = contexts[contexts.length - 1] ?? root;
      const name = subtest[1]?.trim() ?? "";
      pendingSubtest = {
        indent,
        path: parent.path ? `${parent.path} > ${name}` : name,
      };
      sawTap = true;
      continue;
    }

    if (pendingSubtest) pendingSubtest = null;
    const context = contexts[contexts.length - 1] ?? root;

    if (/^Bail out!/i.test(line)) {
      diagnostics.push(
        `TAP bailout${context.path ? ` in ${context.path}` : ""}: ${line.slice(9).trim() || "no reason"}`,
      );
      fatal = true;
      sawTap = true;
      continue;
    }

    const plan = parsePlan(line);
    if (plan !== null) {
      sawTap = true;
      if (plan < 0) {
        diagnostics.push(
          `invalid TAP plan${context.path ? ` in ${context.path}` : ""}: ${line}`,
        );
        fatal = true;
      } else if (context.plan !== undefined) {
        diagnostics.push(
          `duplicate TAP plan${context.path ? ` in ${context.path}` : ""}`,
        );
        fatal = true;
      } else {
        context.plan = plan;
      }
      continue;
    }

    if (line.startsWith("#") || /^---$/.test(line) || /^\.\.\.$/.test(line))
      continue;
    const parsed = parseAssertion(line);
    if (!parsed) continue;
    sawTap = true;
    context.assertions += 1;
    if (!parsed.name) {
      diagnostics.push("TAP assertion has no test name; ignored");
      continue;
    }

    const candidates = nativeIdCandidates(context.path, parsed.name);
    const nativeId = candidates.find((candidate) => lookup(candidate) !== null);
    if (!nativeId) {
      diagnostics.push(`unbound TAP assertion ignored: ${candidates[0]}`);
      continue;
    }
    const bound = lookup(nativeId);
    if (!bound) {
      diagnostics.push(`ambiguous TAP binding for ${nativeId}`);
      fatal = true;
      continue;
    }
    const key = `${bound.target}\0${bound.symbol_id}`;
    const previous = seen.get(key);
    if (previous) {
      if (
        previous.nativeId !== nativeId ||
        previous.outcome !== parsed.outcome
      ) {
        diagnostics.push(`ambiguous duplicate TAP result for ${nativeId}`);
        fatal = true;
      } else {
        diagnostics.push(`duplicate TAP result for ${nativeId}; ignored`);
      }
      continue;
    }
    seen.set(key, { nativeId, outcome: parsed.outcome });
    results.push({
      symbol_id: bound.symbol_id,
      target: bound.target,
      outcome: parsed.outcome,
      binding: "native_case",
      native_id: nativeId,
      attempts: { status: "unavailable" },
    });
  }

  if (!sawTap) return failClosed(["not a TAP report"]);
  if (pendingSubtest) {
    diagnostics.push(
      `TAP subtest has no indented body: ${pendingSubtest.path}`,
    );
    fatal = true;
  }
  for (const context of allContexts) {
    if (context.plan === undefined) {
      if (context.assertions > 0) {
        diagnostics.push(
          `missing TAP plan${context.path ? ` in ${context.path}` : ""}`,
        );
        fatal = true;
      }
      continue;
    }
    if (context.plan !== context.assertions) {
      diagnostics.push(
        `TAP plan mismatch${context.path ? ` in ${context.path}` : ""}: expected ${context.plan} assertion(s), observed ${context.assertions}`,
      );
      fatal = true;
    }
  }
  const ambiguous = ambiguousNativeBindings(bindings);
  if (ambiguous.length > 0) {
    for (const nativeId of ambiguous)
      diagnostics.push(`ambiguous TAP binding for ${nativeId}`);
    fatal = true;
  }
  return fatal ? failClosed(diagnostics) : { results, diagnostics };
}
