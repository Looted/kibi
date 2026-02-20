import type { PrologProcess } from "@kibi/cli/src/prolog.js";

export interface ContextArgs {
  sourceFile: string;
  branch?: string;
}

export interface ContextResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    sourceFile: string;
    entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }>;
    relationships: Array<{ relType: string; fromId: string; toId: string }>;
    provenance: {
      predicate: string;
      deterministic: boolean;
    };
  };
}

export async function handleKbContext(
  prolog: PrologProcess,
  args: ContextArgs,
): Promise<ContextResult> {
  const { sourceFile } = args;

  try {
    const safeSource = sourceFile.replace(/'/g, "\\'");

    const entityGoal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
    const entityQueryResult = await prolog.query(entityGoal);

    const entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }> = [];
    const entityIds: string[] = [];

    if (entityQueryResult.success && entityQueryResult.bindings.Results) {
      const entitiesData = parseListOfLists(entityQueryResult.bindings.Results);

      for (const data of entitiesData) {
        const entity = parseEntityFromList(data);
        entities.push({
          id: entity.id as string,
          type: entity.type as string,
          title: entity.title as string,
          status: entity.status as string,
          tags: (entity.tags as string[]) || [],
        });
        entityIds.push(entity.id as string);
      }
    }

    const relationships: Array<{
      relType: string;
      fromId: string;
      toId: string;
    }> = [];

    for (const entityId of entityIds) {
      const relGoal = `findall([RelType,FromId,ToId], (kb_relationship(RelType, FromId, ToId), (FromId = '${entityId}' ; ToId = '${entityId}')), RelResults)`;
      const relQueryResult = await prolog.query(relGoal);

      if (relQueryResult.success && relQueryResult.bindings.RelResults) {
        const relData = parseListOfLists(relQueryResult.bindings.RelResults);

        for (const rel of relData) {
          relationships.push({
            relType: rel[0],
            fromId: rel[1],
            toId: rel[2],
          });
        }
      }
    }

    const text =
      entities.length > 0
        ? `Found ${entities.length} KB entities linked to source file "${sourceFile}": ${entities.map((e) => e.id).join(", ")}`
        : `No KB entities found for source file "${sourceFile}"`;

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      structuredContent: {
        sourceFile,
        entities,
        relationships,
        provenance: {
          predicate: "kb_entities_by_source",
          deterministic: true,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Context query failed: ${message}`);
  }
}

function parseListOfLists(listStr: string): string[][] {
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
    } else {
      current += char;
    }
  }

  return results;
}

function parseEntityFromList(data: string[]): Record<string, unknown> {
  if (data.length < 3) {
    return {};
  }

  const id = data[0].trim();
  const type = data[1].trim();
  const propsStr = data[2].trim();

  const props = parsePropertyList(propsStr);
  return { ...props, id: normalizeEntityId(stripOuterQuotes(id)), type };
}

function parsePropertyList(propsStr: string): Record<string, unknown> {
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

function parsePrologValue(valueInput: string): unknown {
  const value = valueInput.trim();

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
    const lastSlash = value.lastIndexOf("/");
    if (lastSlash !== -1) {
      return value.substring(lastSlash + 1);
    }
    return value;
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.substring(1, value.length - 1);
  }

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

  return value;
}

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
