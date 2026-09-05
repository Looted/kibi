/*
 * Kibi — per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

type LineCoverage = {
  readonly hits: number;
  readonly suffix: string;
};

type FunctionCoverage = {
  readonly line: number;
  readonly name: string;
  readonly hits: number;
};

type BranchCoverage = {
  readonly line: number;
  readonly block: string;
  readonly branch: string;
  readonly taken: string;
};

type LcovRecord = {
  readonly sourceFile: string;
  readonly testName: string;
  readonly functionFound: number;
  readonly functionHit: number;
  readonly functions: Map<string, FunctionCoverage>;
  readonly branches: Map<string, BranchCoverage>;
  readonly lines: Map<number, LineCoverage>;
};

function numericField(record: string, field: string): number {
  const match = record.match(new RegExp(`^${field}:(\\d+)$`, "m"));
  return match === null ? 0 : Number(match[1]);
}

function parseRecord(record: string): LcovRecord | null {
  const sourceFile = record.match(/^SF:(.*)$/m)?.[1];
  if (sourceFile === undefined || sourceFile.length === 0) return null;

  const lines = new Map<number, LineCoverage>();
  const functions = new Map<string, FunctionCoverage>();
  const functionLinesByName = new Map<string, number[]>();
  const branches = new Map<string, BranchCoverage>();

  for (const line of record.split("\n")) {
    const functionMatch = line.match(/^FN:(\d+),(.*)$/);
    if (functionMatch !== null) {
      const functionLine = Number(functionMatch[1]);
      const name = functionMatch[2] ?? "";
      const key = `${functionLine}:${name}`;
      functions.set(key, { line: functionLine, name, hits: 0 });
      functionLinesByName.set(name, [
        ...(functionLinesByName.get(name) ?? []),
        functionLine,
      ]);
      continue;
    }

    const functionDataMatch = line.match(/^FNDA:(\d+),(.*)$/);
    if (functionDataMatch !== null) {
      const name = functionDataMatch[2] ?? "";
      const functionLine = functionLinesByName.get(name)?.[0] ?? 0;
      const key = `${functionLine}:${name}`;
      const current = functions.get(key);
      functions.set(key, {
        line: current?.line ?? functionLine,
        name,
        hits: Number(functionDataMatch[1]),
      });
      continue;
    }

    const branchMatch = line.match(/^BRDA:(\d+),([^,]*),([^,]*),(.*)$/);
    if (branchMatch !== null) {
      const branch = {
        line: Number(branchMatch[1]),
        block: branchMatch[2] ?? "",
        branch: branchMatch[3] ?? "",
        taken: branchMatch[4] ?? "-",
      };
      branches.set(`${branch.line}:${branch.block}:${branch.branch}`, branch);
      continue;
    }

    const lineMatch = line.match(/^DA:(\d+),(\d+)(,.*)?$/);
    if (lineMatch === null) continue;

    const lineNumber = Number(lineMatch[1]);
    const hits = Number(lineMatch[2]);
    const suffix = lineMatch[3] ?? "";
    const current = lines.get(lineNumber);
    if (current === undefined || hits > current.hits) {
      lines.set(lineNumber, { hits, suffix });
    }
  }

  return {
    sourceFile,
    testName: record.match(/^TN:(.*)$/m)?.[1] ?? "",
    functionFound: numericField(record, "FNF"),
    functionHit: numericField(record, "FNH"),
    functions,
    branches,
    lines,
  };
}

function mergeBranch(
  existing: BranchCoverage,
  incoming: BranchCoverage,
): BranchCoverage {
  const existingTaken = Number(existing.taken);
  const incomingTaken = Number(incoming.taken);
  if (Number.isNaN(existingTaken) && Number.isNaN(incomingTaken)) {
    return existing;
  }

  return {
    ...existing,
    taken: String(
      Math.max(
        Number.isNaN(existingTaken) ? 0 : existingTaken,
        Number.isNaN(incomingTaken) ? 0 : incomingTaken,
      ),
    ),
  };
}

function lineHitRate(lines: ReadonlyMap<number, LineCoverage>): number {
  if (lines.size === 0) return 0;
  let hits = 0;
  for (const line of lines.values()) {
    if (line.hits > 0) hits += 1;
  }
  return hits / lines.size;
}

function isCompleteLineMap(lines: ReadonlyMap<number, LineCoverage>): boolean {
  return lines.size >= 20 && lineHitRate(lines) >= 0.95;
}

function mergeRecord(
  existing: LcovRecord | undefined,
  incoming: LcovRecord,
): LcovRecord {
  if (existing === undefined) {
    return {
      ...incoming,
      functions: new Map(incoming.functions),
      branches: new Map(incoming.branches),
      lines: new Map(incoming.lines),
    };
  }

  const existingComplete = isCompleteLineMap(existing.lines);
  const incomingComplete = isCompleteLineMap(incoming.lines);
  const lines = new Map(existing.lines);
  for (const [lineNumber, incomingLine] of incoming.lines) {
    const existingLine = lines.get(lineNumber);
    if (existingLine === undefined) {
      // Query-string / alternate import graphs can emit extra DA:0 rows for
      // the same file. Do not union those zeros into an already-complete map.
      if (incomingLine.hits === 0 && existingComplete) continue;
      lines.set(lineNumber, incomingLine);
      continue;
    }
    if (incomingLine.hits > existingLine.hits) {
      lines.set(lineNumber, incomingLine);
    }
  }
  if (incomingComplete) {
    for (const [lineNumber, existingLine] of [...lines.entries()]) {
      if (existingLine.hits === 0 && !incoming.lines.has(lineNumber)) {
        lines.delete(lineNumber);
      }
    }
  }

  const functions = new Map(existing.functions);
  for (const [key, incomingFunction] of incoming.functions) {
    const existingFunction = functions.get(key);
    if (
      existingFunction === undefined ||
      incomingFunction.hits > existingFunction.hits
    ) {
      functions.set(key, incomingFunction);
    }
  }

  const branches = new Map(existing.branches);
  for (const [key, incomingBranch] of incoming.branches) {
    const existingBranch = branches.get(key);
    branches.set(
      key,
      existingBranch === undefined
        ? incomingBranch
        : mergeBranch(existingBranch, incomingBranch),
    );
  }

  const hasFunctionIdentities = functions.size > 0;
  return {
    sourceFile: existing.sourceFile,
    testName: existing.testName,
    functionFound: hasFunctionIdentities
      ? functions.size
      : Math.max(existing.functionFound, incoming.functionFound),
    functionHit: hasFunctionIdentities
      ? [...functions.values()].filter((fn) => fn.hits > 0).length
      : Math.max(existing.functionHit, incoming.functionHit),
    functions,
    branches,
    lines,
  };
}

function renderRecord(record: LcovRecord): string {
  const functions = [...record.functions.values()].sort(
    (left, right) =>
      left.line - right.line || left.name.localeCompare(right.name),
  );
  const branches = [...record.branches.values()].sort(
    (left, right) =>
      left.line - right.line ||
      left.block.localeCompare(right.block) ||
      left.branch.localeCompare(right.branch),
  );
  const lines = [...record.lines.entries()].sort(
    ([left], [right]) => left - right,
  );
  const lineCount = lines.length;
  const hitLineCount = lines.filter(([, coverage]) => coverage.hits > 0).length;
  const hitBranchCount = branches.filter(
    (branch) => branch.taken !== "-" && Number(branch.taken) > 0,
  ).length;

  return [
    `TN:${record.testName}`,
    `SF:${record.sourceFile}`,
    ...functions.map((fn) => `FN:${fn.line},${fn.name}`),
    ...functions.map((fn) => `FNDA:${fn.hits},${fn.name}`),
    `FNF:${record.functionFound}`,
    `FNH:${record.functionHit}`,
    ...branches.map(
      (branch) =>
        `BRDA:${branch.line},${branch.block},${branch.branch},${branch.taken}`,
    ),
    ...(branches.length > 0
      ? [`BRF:${branches.length}`, `BRH:${hitBranchCount}`]
      : []),
    ...lines.map(
      ([lineNumber, coverage]) =>
        `DA:${lineNumber},${coverage.hits}${coverage.suffix}`,
    ),
    `LF:${lineCount}`,
    `LH:${hitLineCount}`,
    "end_of_record",
  ].join("\n");
}

// implements REQ-014
export function mergeLcovContents(contents: readonly string[]): string {
  const merged = new Map<string, LcovRecord>();
  for (const content of contents) {
    for (const rawRecord of content
      .split("end_of_record")
      .map((record) => record.trim())
      .filter((record) => record.length > 0)) {
      const record = parseRecord(rawRecord);
      if (record === null) continue;
      merged.set(
        record.sourceFile,
        mergeRecord(merged.get(record.sourceFile), record),
      );
    }
  }

  return (
    [...merged.values()].map(renderRecord).join("\n") +
    (merged.size > 0 ? "\n" : "")
  );
}
