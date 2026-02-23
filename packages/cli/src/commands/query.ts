import * as path from "node:path";
import Table from "cli-table3";
import { PrologProcess } from "../prolog.js";

interface QueryOptions {
  id?: string;
  tag?: string;
  source?: string;
  relationships?: string;
  format?: "json" | "table";
  limit?: string;
  offset?: string;
}

export async function queryCommand(
  type: string | undefined,
  options: QueryOptions,
): Promise<void> {
  try {
    const prolog = new PrologProcess();
    await prolog.start();

    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    let currentBranch = "main";
    try {
      const { execSync } = await import("node:child_process");
      currentBranch = execSync("git branch --show-current", {
        cwd: process.cwd(),
        encoding: "utf8",
      }).trim();
      if (!currentBranch || currentBranch === "master") currentBranch = "main";
    } catch {
      currentBranch = "main";
    }

    const kbPath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(
        `Error: Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
      process.exit(1);
    }

    let results: any[] = [];

    // Query relationships mode
    if (options.relationships) {
      const goal = `findall([Type,From,To], kb_relationship(Type, ${options.relationships}, To), Results)`;
      const queryResult = await prolog.query(goal);

      if (queryResult.success && queryResult.bindings.Results) {
        const relationshipsData = parseListOfLists(
          queryResult.bindings.Results,
        );

        results = relationshipsData.map((rel) => ({
          type: rel[0],
          from: options.relationships,
          to: rel[1],
        }));
      }
    }
    // Query entities mode
    else if (type || options.source) {
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
          await prolog.query("kb_detach");
          await prolog.terminate();
          console.error(
            `Error: Invalid type '${type}'. Valid types: ${validTypes.join(", ")}`,
          );
          process.exit(1);
        }
      }

      let goal: string;

      if (options.source) {
        // Query by source path (substring match)
        const safeSource = String(options.source).replace(/'/g, "\\'");
        if (type) {
          goal = `findall([Id,'${type}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${type}', Props)), Results)`;
        } else {
          goal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
        }
      } else if (options.id) {
        const safeId = String(options.id).replace(/'/g, "''");
        goal = `kb_entity('${safeId}', '${type}', Props), Id = '${safeId}', Type = '${type}', Result = [Id, Type, Props]`;
      } else if (options.tag) {
        const safeTag = String(options.tag).replace(/'/g, "''");
        goal = `findall([Id,'${type}',Props], (kb_entity(Id, '${type}', Props), memberchk(tags=Tags, Props), member('${safeTag}', Tags)), Results)`;
      } else {
        goal = `findall([Id,'${type}',Props], kb_entity(Id, '${type}', Props), Results)`;
      }

      const queryResult = await prolog.query(goal);

      if (queryResult.success) {
        if (options.id) {
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
      }
    } else {
      await prolog.query("kb_detach");
      await prolog.terminate();
      console.error(
        "Error: Must specify entity type, --source, or --relationships option",
      );
      process.exit(1);
    }

    await prolog.query("kb_detach");
    await prolog.terminate();

    // Apply pagination
    const limit = Number.parseInt(options.limit || "100");
    const offset = Number.parseInt(options.offset || "0");
    const paginated = results.slice(offset, offset + limit);

    if (!paginated || paginated.length === 0) {
      if (options.format === "json") {
        console.log("[]");
      } else {
        console.log("No entities found");
      }
      process.exit(0);
    }

    // Format output
    if (options.format === "table") {
      outputTable(paginated, Boolean(options.relationships));
    } else {
      console.log(JSON.stringify(paginated, null, 2));
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

/**
 * Parse a Prolog list of lists into a JavaScript array.
 * Input: "[[a,b,c],[d,e,f]]"
 * Output: [["a", "b", "c"], ["d", "e", "f"]]
 */
function parseListOfLists(listStr: string): string[][] {
  // Clean input
  const cleaned = listStr.trim().replace(/^\[/, "").replace(/\]$/, "");

  if (cleaned === "") {
    return [];
  }

  const results: string[][] = [];
  let depth = 0;
  let inQuotes = false;
  let current = "";
  let currentList: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prevChar = i > 0 ? cleaned[i - 1] : "";

    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (inQuotes) {
      current += char;
      continue;
    }

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
function parseEntityFromBinding(bindingStr: string): any {
  const cleaned = bindingStr.trim().replace(/^\[/, "").replace(/\]$/, "");
  const parts = splitTopLevel(cleaned, ",");

  if (parts.length < 3) {
    return {};
  }

  const id = parts[0].trim();
  const type = parts[1].trim();
  const propsStr = parts.slice(2).join(",").trim();

  const props = parsePropertyList(propsStr);
  return { id, type, ...props };
}

/**
 * Parse entity from array returned by parseListOfLists.
 * Input: ["abc123", "req", "[id=abc123, title=\"Test\", ...]"]
 */
function parseEntityFromList(data: string[]): any {
  if (data.length < 3) {
    return {};
  }

  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();

  const props = parsePropertyList(propsStr);
  return { id, type, ...props };
}

/**
 * Parse Prolog property list into JavaScript object.
 * Input: "[id=abc123, title=^^(\"User Auth\", xsd:string), status='file:///path/approved', tags=^^(\"[security,auth]\", xsd:string)]"
 * Output: { id: "abc123", title: "User Auth", status: "approved", tags: ["security", "auth"] }
 */
function parsePropertyList(propsStr: string): Record<string, any> {
  const props: Record<string, any> = {};

  // Remove outer brackets
  let cleaned = propsStr.trim();
  if (cleaned.startsWith("[")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith("]")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  // Split by top-level commas
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
 * Examples:
 * - ^^("value", 'http://...#string') -> "value"
 * - 'file:///path/to/id' -> "id" (extract last segment)
 * - "string" -> "string"
 * - atom -> "atom"
 * - [a,b,c] -> ["a", "b", "c"]
 */
function parsePrologValue(value: string): any {
  value = value.trim();

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

      if (literalValue.startsWith("[") && literalValue.endsWith("]")) {
        const listContent = literalValue.substring(1, literalValue.length - 1);
        if (listContent === "") {
          return [];
        }
        return listContent.split(",").map((item) => item.trim());
      }

      return literalValue;
    }
  }

  if (value.startsWith("file:///")) {
    const cleaned = value;
    const lastSlash = cleaned.lastIndexOf("/");
    if (lastSlash !== -1) {
      return cleaned.substring(lastSlash + 1);
    }
    return cleaned;
  }

  // Handle quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  // Handle quoted atom (may contain file URLs that need extraction)
  if (value.startsWith("'") && value.endsWith("'")) {
    const unquoted = value.substring(1, value.length - 1);
    // Check if unquoted value is a file URL
    if (unquoted.startsWith("file:///")) {
      const lastSlash = unquoted.lastIndexOf("/");
      if (lastSlash !== -1) {
        return unquoted.substring(lastSlash + 1);
      }
    }
    return unquoted;
  }

  // Handle list
  if (value.startsWith("[") && value.endsWith("]")) {
    const listContent = value.substring(1, value.length - 1);
    if (listContent === "") {
      return [];
    }
    const items = listContent.split(",").map((item) => {
      return parsePrologValue(item.trim());
    });
    return items;
  }

  // Return as-is
  return value;
}

/**
 * Split a string by delimiter at the top level (not inside brackets or quotes).
 */
function splitTopLevel(str: string, delimiter: string): string[] {
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

/**
 * Output results as a formatted table.
 */
function outputTable(items: any[], isRelationships: boolean): void {
  if (items.length === 0) {
    console.log("No entities found.");
    return;
  }

  if (isRelationships) {
    const table = new Table({
      head: ["Type", "From", "To"],
      colWidths: [20, 18, 18],
    });

    for (const item of items) {
      table.push([
        item.type || "N/A",
        item.from?.substring(0, 16) || "N/A",
        item.to?.substring(0, 16) || "N/A",
      ]);
    }

    console.log(table.toString());
  } else {
    const table = new Table({
      head: ["ID", "Type", "Title", "Status", "Tags"],
      colWidths: [18, 10, 40, 12, 30],
    });

    for (const entity of items) {
      table.push([
        entity.id?.substring(0, 16) || "N/A",
        entity.type || "N/A",
        (entity.title || "N/A").substring(0, 38),
        entity.status || "N/A",
        (entity.tags || []).join(", ").substring(0, 28) || "",
      ]);
    }

    console.log(table.toString());
  }
}
