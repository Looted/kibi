export function parseAtomList(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  return splitTopLevel(content, ",")
    .map((token) => stripQuotes(token.trim()))
    .filter((token) => token.length > 0);
}

export function parsePairList(raw: string): Array<[string, string]> {
  const rows = parseListRows(raw);
  const pairs: Array<[string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevel(row, ",").map((part) => stripQuotes(part.trim()));
    if (parts.length >= 2) {
      pairs.push([parts[0], parts[1]]);
    }
  }

  return pairs;
}

export function parseTriples(raw: string): Array<[string, string, string]> {
  const rows = parseListRows(raw);
  const triples: Array<[string, string, string]> = [];

  for (const row of rows) {
    const parts = splitTopLevel(row, ",").map((part) => stripQuotes(part.trim()));
    if (parts.length >= 3) {
      triples.push([parts[0], parts[1], parts[2]]);
    }
  }

  return triples;
}

function parseListRows(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "[]" || trimmed.length === 0) {
    return [];
  }

  const content = unwrapList(trimmed);
  if (content.length === 0) {
    return [];
  }

  const rows: string[] = [];
  let depth = 0;
  let current = "";

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "[") {
      depth++;
      if (depth > 1) {
        current += ch;
      }
      continue;
    }

    if (ch === "]") {
      depth--;
      if (depth === 0) {
        rows.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "," && depth === 0) {
      continue;
    }

    current += ch;
  }

  return rows;
}

function unwrapList(value: string): string {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (ch === '"' && !inSingleQuotes && prev !== "\\") {
      inDoubleQuotes = !inDoubleQuotes;
      current += ch;
      continue;
    }

    if (ch === "'" && !inDoubleQuotes && prev !== "\\") {
      inSingleQuotes = !inSingleQuotes;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && (ch === "[" || ch === "(")) {
      depth++;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && (ch === "]" || ch === ")")) {
      depth--;
      current += ch;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && depth === 0 && ch === delimiter) {
      if (current.length > 0) {
        parts.push(current);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

function stripQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}
