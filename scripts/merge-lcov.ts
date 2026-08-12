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

type LcovRecord = {
  readonly sourceFile: string;
  readonly testName: string;
  readonly functionFound: number;
  readonly functionHit: number;
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
  for (const line of record.split("\n")) {
    const match = line.match(/^DA:(\d+),(\d+)(,.*)?$/);
    if (match === null) continue;

    const lineNumber = Number(match[1]);
    const hits = Number(match[2]);
    const suffix = match[3] ?? "";
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
    lines,
  };
}

function mergeRecord(
  existing: LcovRecord | undefined,
  incoming: LcovRecord,
): LcovRecord {
  if (existing === undefined) {
    return {
      ...incoming,
      lines: new Map(incoming.lines),
    };
  }

  const lines = new Map(existing.lines);
  for (const [lineNumber, incomingLine] of incoming.lines) {
    const existingLine = lines.get(lineNumber);
    if (existingLine === undefined || incomingLine.hits > existingLine.hits) {
      lines.set(lineNumber, incomingLine);
    }
  }

  return {
    sourceFile: existing.sourceFile,
    testName: existing.testName,
    functionFound: Math.max(existing.functionFound, incoming.functionFound),
    // Bun currently emits function totals without function identities. Keep
    // this conservative when shards overlap; line coverage is merged exactly.
    functionHit: Math.max(existing.functionHit, incoming.functionHit),
    lines,
  };
}

function renderRecord(record: LcovRecord): string {
  const lines = [...record.lines.entries()].sort(
    ([left], [right]) => left - right,
  );
  const lineCount = lines.length;
  const hitLineCount = lines.filter(([, coverage]) => coverage.hits > 0).length;

  return [
    `TN:${record.testName}`,
    `SF:${record.sourceFile}`,
    `FNF:${record.functionFound}`,
    `FNH:${record.functionHit}`,
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
