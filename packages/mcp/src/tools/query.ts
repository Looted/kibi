import type { PrologProcess } from "@kibi/cli/src/prolog.js";

export interface QueryArgs {
  type?: string;
  id?: string;
  tags?: string[];
  sourceFile?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    entities: Record<string, unknown>[];
    count: number;
  };
}

/**
 * Handle kb.query tool calls
 * Reuses query logic from CLI command
 */
export async function handleKbQuery(
  prolog: PrologProcess,
  args: QueryArgs,
): Promise<QueryResult> {
  const { type, id, tags, sourceFile, limit = 100, offset = 0 } = args;

  try {
    let results: Record<string, unknown>[] = [];

    // Validate type if provided
    if (type) {
      const validTypes = [
        "req",
        "scenario",
        "test",
        "adr",
        "flag",
        "event",
        "symbol",
        "fact",
      ];
      if (!validTypes.includes(type)) {
        throw new Error(
          `Invalid type '${type}'. Valid types: ${validTypes.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
        );
      }
    }

    // Build Prolog query
    let goal: string;

    if (sourceFile) {
      const safeSource = sourceFile.replace(/'/g, "\\'");
      if (type) {
        goal = `findall([Id,'${type}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${type}', Props)), Results)`;
      } else {
        goal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
      }
    } else if (id && type) {
      goal = `kb_entity('${id}', '${type}', Props), Id = '${id}', Type = '${type}', Result = [Id, Type, Props]`;
    } else if (id) {
      goal = `findall(['${id}',Type,Props], kb_entity('${id}', Type, Props), Results)`;
    } else if (tags && tags.length > 0) {
      const tagList = `[${tags.map((t) => `'${t}'`).join(",")}]`;
      if (type) {
        goal = `findall([Id,'${type}',Props], (kb_entity(Id, '${type}', Props), memberchk(tags=Tags, Props), member(Tag, Tags), member(Tag, ${tagList})), Results)`;
      } else {
        goal = `findall([Id,Type,Props], (kb_entity(Id, Type, Props), memberchk(tags=Tags, Props), member(Tag, Tags), member(Tag, ${tagList})), Results)`;
      }
    } else if (type) {
      goal = `findall([Id,'${type}',Props], kb_entity(Id, '${type}', Props), Results)`;
    } else {
      goal = "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
    }

    const queryResult = await prolog.query(goal);

    if (queryResult.success) {
      if (id && type) {
        // Single entity query
        if (queryResult.bindings.Result) {
          const entity = parseEntityFromBinding(queryResult.bindings.Result);
          results = [entity];
        }
      } else {
        // Multiple entities query
        if (queryResult.bindings.Results) {
          const entitiesData = parseListOfLists(queryResult.bindings.Results);

          for (const data of entitiesData) {
            const entity = parseEntityFromList(data);
            results.push(entity);
          }
        }
      }
    } else {
      throw new Error(queryResult.error || "Query failed with unknown error");
    }

    // Apply pagination
    const paginated = results.slice(offset, offset + limit);

    // Build human-readable text with entity IDs and titles
    let text: string;
    if (results.length === 0) {
      text = `No entities found${type ? ` of type '${type}'` : ""}.`;
    } else {
      const details = paginated
        .map((e) => {
          const id = (e.id as string).replace(/^file:\/\/.*\//, "");
          const title = e.title as string;
          const status = e.status as string;
          return `${id} (${title}, status=${status})`;
        })
        .join(", ");
      text = `Found ${results.length} entities${type ? ` of type '${type}'` : ""}. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${details}`;
    }

    // Return MCP structured response
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      structuredContent: {
        entities: paginated,
        count: results.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Query execution failed: ${message}`);
  }
}

/**
 * Parse a Prolog list of lists into a JavaScript array.
 * Input: "[[a,b,c],[d,e,f]]"
 * Output: [["a", "b", "c"], ["d", "e", "f"]]
 */
export function parseListOfLists(listStr: string): string[][] {
  const cleaned = listStr.trim().replace(/^\[/, "").replace(/\]$/, "");

  if (cleaned === "") {
    return [];
  }

  const results: string[][] = [];
  let depth = 0;
  let current = "";
  let currentList: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === "[") {
      depth++;
      if (depth > 1) current += char;
    } else if (char === "]") {
      depth--;
      if (depth === 0) {
        if (current) {
          currentList.push(current.trim());
          current = "";
        }
        if (currentList.length > 0) {
          results.push(currentList);
          currentList = [];
        }
      } else {
        current += char;
      }
    } else if (char === "," && depth === 1) {
      if (current) {
        currentList.push(current.trim());
        current = "";
      }
    } else if (char === "," && depth === 0) {
      // Skip comma between lists
    } else {
      current += char;
    }
  }

  return results;
}

/**
 * Parse a single entity from Prolog binding format.
 * Input: "[abc123, req, [id=abc123, title=\"Test\", ...]]"
 */
export function parseEntityFromBinding(
  bindingStr: string,
): Record<string, unknown> {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  const parts = splitTopLevel(cleaned, ",");

  if (parts.length < 3) {
    return {};
  }

  const id = parts[0].trim();
  const type = parts[1].trim();
  const propsStr = parts.slice(2).join(",").trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

/**
 * Parse entity from array returned by parseListOfLists.
 * Input: ["abc123", "req", "[id=abc123, title=\"Test\", ...]"]
 */
export function parseEntityFromList(data: string[]): Record<string, unknown> {
  if (data.length < 3) {
    return {};
  }

  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

/**
 * Parse Prolog property list into JavaScript object.
 */
export function parsePropertyList(propsStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  let cleaned = propsStr.trim();
  if (cleaned.startsWith("[")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith("]")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  const pairs = splitTopLevel(cleaned, ",");

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;

    const key = pair.substring(0, eqIndex).trim();
    const value = pair.substring(eqIndex + 1).trim();

    if (key === "..." || value === "..." || value === "...|...") {
      continue;
    }

    const parsed = parsePrologValue(value);
    props[key] = parsed;
  }

  return props;
}

/**
 * Parse a single Prolog value, handling typed literals and URIs.
 */
export function parsePrologValue(valueInput: string): unknown {
  const value = valueInput.trim();

  // Handle typed literal: ^^("value", type)
  if (value.startsWith("^^(")) {
    const innerStart = value.indexOf("(") + 1;
    let depth = 1;
    let innerEnd = innerStart;
    for (let i = innerStart; i < value.length; i++) {
      if (value[i] === "(") depth++;
      if (value[i] === ")") {
        depth--;
        if (depth === 0) {
          innerEnd = i;
          break;
        }
      }
    }
    const innerContent = value.substring(innerStart, innerEnd);

    const parts = splitTopLevel(innerContent, ",");
    if (parts.length >= 2) {
      let literalValue = parts[0].trim();

      if (literalValue.startsWith('"') && literalValue.endsWith('"')) {
        literalValue = literalValue.substring(1, literalValue.length - 1);
      }

      // Handle array notation
      if (literalValue.startsWith("[") && literalValue.endsWith("]")) {
        const listContent = literalValue.substring(1, literalValue.length - 1);
        if (listContent === "") {
          return [];
        }
        return splitTopLevel(listContent, ",").map((item) => item.trim());
      }

      return literalValue;
    }
  }

  // Handle URI
  if (value.startsWith("file:///")) {
    const lastSlash = value.lastIndexOf("/");
    if (lastSlash !== -1) {
      return value.substring(lastSlash + 1);
    }
    return value;
  }

  // Handle quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  // Handle quoted atom
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.substring(1, value.length - 1);
  }

  // Handle list
  if (value.startsWith("[") && value.endsWith("]")) {
    const listContent = value.substring(1, value.length - 1);
    if (listContent === "") {
      return [];
    }
    const items = splitTopLevel(listContent, ",").map((item) => {
      return parsePrologValue(item.trim());
    });
    return items;
  }

  return value;
}

/**
 * Split a string by delimiter at the top level (not inside brackets or quotes).
 */
export function splitTopLevel(str: string, delimiter: string): string[] {
  const results: string[] = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";

    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && (char === "[" || char === "(")) {
      depth++;
      current += char;
    } else if (!inQuotes && (char === "]" || char === ")")) {
      depth--;
      current += char;
    } else if (!inQuotes && depth === 0 && char === delimiter) {
      if (current) {
        results.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    results.push(current);
  }

  return results;
}

function stripOuterQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeEntityId(value: string): string {
  if (!value.startsWith("file:///")) {
    return value;
  }

  const idx = value.lastIndexOf("/");
  return idx === -1 ? value : value.slice(idx + 1);
}
