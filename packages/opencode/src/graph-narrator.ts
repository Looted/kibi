// implements REQ-opencode-kibi-briefing-v6

export interface GraphNarrativeResult {
  headline: string;
  tldr: string;
  domains: Array<{
    name: string;
    changes: string[];
  }>;
  relationshipChanges: string[];
  validationStatus: string;
}

type CheckResult = {
  count: number;
  violations: Array<{ rule: string; entityId: string; description: string }>;
};

type ChangedRelationship = { from: string; to: string; type: string };

type SessionApi = {
  create: (parameters: {
    directory: string;
    title: string;
  }) => Promise<unknown>;
  prompt: (parameters: {
    sessionID: string;
    parts: Array<{ type: "text"; text: string }>;
    tools: Record<string, boolean>;
    format?: { type: "json_schema"; schema: Record<string, unknown> };
  }) => Promise<unknown>;
};

type EntitySummary = {
  id: string;
  type: string;
  title: string;
  status: string;
  source: string;
  tags: string[];
  factKind: string;
  removed: boolean;
};

type GraphSummary = {
  edges: ChangedRelationship[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function getSessionApi(client: unknown): SessionApi | null {
  const root = asRecord(client);
  const session = asRecord(root?.session);
  if (!session) {
    return null;
  }

  const create = session.create;
  const prompt = session.prompt;
  if (typeof create !== "function" || typeof prompt !== "function") {
    return null;
  }

  return {
    create: create as SessionApi["create"],
    prompt: prompt as SessionApi["prompt"],
  };
}

function extractSessionId(response: unknown): string | null {
  const root = asRecord(response);
  if (!root) {
    return null;
  }

  const directId = asString(root.id).trim();
  if (directId) {
    return directId;
  }

  const data = asRecord(root.data);
  return asString(data?.id).trim() || null;
}

function extractPromptResponseJson(response: unknown): unknown {
  const root = asRecord(response);
  if (!root) return null;
  const data = asRecord(root.data);
  const parts = Array.isArray(data?.parts)
    ? data.parts
    : Array.isArray(root.parts)
      ? root.parts
      : null;
  if (!parts) return null;

  for (const part of parts) {
    const record = asRecord(part);
    if (record?.type !== "text") {
      continue;
    }

    const text = asString(record.text);
    if (!text) {
      continue;
    }

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return null;
}

async function invokeTool(
  sessionApi: SessionApi,
  sessionID: string,
  tool: "kb_query" | "kb_graph",
  args: Record<string, unknown>,
): Promise<unknown> {
  const response = await sessionApi.prompt({
    sessionID,
    parts: [{ type: "text", text: JSON.stringify({ tool, args }) }],
    tools: { [tool]: true },
    format: {
      type: "json_schema",
      schema: {
        type: ["object", "array"],
      },
    },
  });

  return extractPromptResponseJson(response);
}

function inferTypeFromId(id: string): string {
  const prefix = id.split("-")[0]?.toLowerCase() ?? "entity";
  switch (prefix) {
    case "req":
    case "scenario":
    case "test":
    case "adr":
    case "flag":
    case "event":
    case "symbol":
    case "fact":
      return prefix;
    case "scen":
      return "scenario";
    case "sym":
      return "symbol";
    default:
      return prefix;
  }
}

function humanizeType(type: string, count = 1): string {
  const singular =
    {
      req: "requirement",
      scenario: "scenario",
      test: "test",
      adr: "ADR",
      flag: "flag",
      event: "event",
      symbol: "symbol",
      fact: "fact",
    }[type] ?? type;

  if (count === 1) {
    return singular;
  }

  if (singular === "ADR") {
    return "ADRs";
  }

  return singular.endsWith("s") ? singular : `${singular}s`;
}

function humanizeDomain(domain: string): string {
  const normalized = domain.trim().toLowerCase();
  switch (normalized) {
    case "opencode":
      return "OpenCode";
    case "mcp":
      return "MCP";
    case "cli":
      return "CLI";
    case "vscode":
      return "VSCode";
    case "core":
      return "Core";
    case "requirements":
      return "Requirements";
    default:
      return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Changes";
  }
}

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function normalizeEntity(record: Record<string, unknown>, idFallback: string): EntitySummary {
  const properties = asRecord(record.properties) ?? {};
  const id = asString(record.id || properties.id).trim() || idFallback;
  const type =
    asString(record.type).trim() ||
    asString(record.entityType).trim() ||
    inferTypeFromId(id);
  const title =
    asString(record.title).trim() ||
    asString(properties.title).trim() ||
    id;
  const status =
    asString(record.status).trim() ||
    asString(properties.status).trim() ||
    asString(properties.change_kind).trim();
  const source =
    asString(record.source).trim() ||
    asString(properties.source).trim();
  const tags = [
    ...asStringArray(record.tags),
    ...asStringArray(properties.tags),
  ];
  const factKind =
    asString(record.fact_kind).trim() ||
    asString(properties.fact_kind).trim();

  return {
    id,
    type,
    title,
    status,
    source,
    tags,
    factKind,
    removed: false,
  };
}

function normalizeGraph(value: unknown): GraphSummary | null {
  const root = asRecord(value);
  if (!root) {
    return null;
  }

  const edges = Array.isArray(root.edges)
    ? root.edges
        .map((edge) => {
          const record = asRecord(edge);
          if (!record) return null;
          const from = asString(record.from).trim();
          const to = asString(record.to).trim();
          const type = asString(record.type).trim();
          return from && to && type ? { from, to, type } : null;
        })
        .filter((edge): edge is ChangedRelationship => edge !== null)
    : [];

  return { edges };
}

function describeEntity(entity: EntitySummary | undefined, id: string): string {
  if (!entity) {
    return id;
  }

  return `${entity.title} (${entity.id})`;
}

function inferDomain(entity: EntitySummary): string {
  const source = entity.source.replaceAll("\\", "/");
  const packageMatch = source.match(/packages\/([^/]+)\//);
  if (packageMatch?.[1]) {
    return humanizeDomain(packageMatch[1]);
  }

  const tagDomain = entity.tags.find((tag) =>
    ["cli", "mcp", "vscode", "opencode", "core"].includes(tag.toLowerCase()),
  );
  if (tagDomain) {
    return humanizeDomain(tagDomain);
  }

  if (["req", "scenario", "test"].includes(entity.type)) {
    return "Requirements";
  }

  return humanizeDomain(entity.type);
}

function classifyRelationship(
  relationship: ChangedRelationship,
  entities: Map<string, EntitySummary>,
): string | null {
  const fromEntity = entities.get(relationship.from);
  const toEntity = entities.get(relationship.to);
  const fromText = describeEntity(fromEntity, relationship.from);
  const toText = describeEntity(toEntity, relationship.to);

  switch (relationship.type) {
    case "supersedes":
      return `${toText} was superseded by ${fromText}`;
    case "implements":
      return `${fromText} now implements ${toText}`;
    case "covered_by":
      return `${fromText} gained test coverage via ${toText}`;
    case "verified_by":
      return `${fromText} is verified by ${toText}`;
    case "specified_by":
      return `${fromText} is specified by ${toText}`;
    case "requires_property":
      return `${fromText} constrains property ${toText}`;
    case "constrains":
      if (toEntity?.type === "fact" && toEntity.factKind === "subject") {
        return `${fromText} is linked to fact ${toText}`;
      }
      return `${fromText} is linked to ${toText}`;
    default:
      return null;
  }
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function buildEntityChange(
  entity: EntitySummary,
  relationships: ChangedRelationship[],
  graph: GraphSummary | null,
): string {
  const label = describeEntity(entity, entity.id);
  if (entity.removed) {
    return `${label} was removed`;
  }

  if (entity.status === "superseded") {
    return `${label} was marked superseded`;
  }

  const hasRelationshipChange = relationships.some(
    (relationship) =>
      relationship.from === entity.id || relationship.to === entity.id,
  );
  const hasGraphEdges = (graph?.edges.length ?? 0) > 0;
  if (!hasRelationshipChange && !hasGraphEdges) {
    return `${label} was created`;
  }

  return `${label} was updated`;
}

function summarizeTypes(entities: EntitySummary[]): string {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    counts.set(entity.type, (counts.get(entity.type) ?? 0) + 1);
  }

  return formatList(
    [...counts.entries()].map(
      ([type, count]) => `${count} ${humanizeType(type, count)}`,
    ),
  );
}

function summarizeTopChanges(
  domainChanges: string[],
  relationshipChanges: string[],
): string {
  const focus = relationshipChanges.length > 0 ? relationshipChanges : domainChanges;
  const selected = focus.slice(0, 2);
  return selected.length > 0 ? `Key changes: ${selected.join("; ")}.` : "";
}

function validationStatusText(checkResult: CheckResult): string {
  if (checkResult.count <= 0) {
    return "All checks pass";
  }

  return `${checkResult.count} validation issue${checkResult.count === 1 ? "" : "s"}`;
}

async function loadEntity(
  sessionApi: SessionApi,
  sessionID: string,
  id: string,
): Promise<EntitySummary | null> {
  const response = await invokeTool(sessionApi, sessionID, "kb_query", { id, limit: 1 });
  if (!Array.isArray(response)) {
    throw new Error(`kb_query returned unsupported payload for ${id}`);
  }

  if (response.length === 0) {
    return {
      id,
      type: inferTypeFromId(id),
      title: id,
      status: "removed",
      source: "",
      tags: [],
      factKind: "",
      removed: true,
    };
  }

  const record = asRecord(response[0]);
  if (!record) {
    throw new Error(`kb_query returned invalid entity for ${id}`);
  }

  return normalizeEntity(record, id);
}

async function loadGraph(
  sessionApi: SessionApi,
  sessionID: string,
  id: string,
): Promise<GraphSummary | null> {
  const response = await invokeTool(sessionApi, sessionID, "kb_graph", {
    seedIds: [id],
    direction: "both",
    depth: 2,
    maxNodes: 100,
    maxEdges: 200,
  });

  return normalizeGraph(response);
}

// implements REQ-opencode-kibi-briefing-v2
export async function generateGraphNarrative(
  client: unknown,
  workspaceCtx: { workspaceRoot: string; branch: string },
  changedEntityIds: string[],
  changedRelationships: Array<{ from: string; to: string; type: string }>,
  checkResult: {
    count: number;
    violations: Array<{ rule: string; entityId: string; description: string }>;
  },
): Promise<GraphNarrativeResult | null> {
  const uniqueIds = uniqueStrings(changedEntityIds);
  if (uniqueIds.length === 0) {
    return null;
  }

  const sessionApi = getSessionApi(client);
  if (!sessionApi) {
    return null;
  }

  let sessionID: string | null = null;
  try {
    const worker = await sessionApi.create({
      directory: workspaceCtx.workspaceRoot,
      title: `Kibi Graph Narrator (${workspaceCtx.branch})`,
    });
    sessionID = extractSessionId(worker);
  } catch {
    return null;
  }

  if (!sessionID) {
    return null;
  }

  const entities = new Map<string, EntitySummary>();
  const graphs = new Map<string, GraphSummary | null>();

  for (const id of uniqueIds) {
    let entity: EntitySummary | null;
    try {
      entity = await loadEntity(sessionApi, sessionID, id);
    } catch {
      continue;
    }

    if (!entity) {
      continue;
    }

    entities.set(id, entity);

    if (entity.removed) {
      graphs.set(id, null);
      continue;
    }

    try {
      graphs.set(id, await loadGraph(sessionApi, sessionID, id));
    } catch {
      graphs.set(id, null);
    }
  }

  const entityList = [...entities.values()];
  if (entityList.length === 0) {
    return null;
  }

  const relationshipChanges = uniqueStrings(
    changedRelationships
      .map((relationship) => classifyRelationship(relationship, entities))
      .filter((sentence): sentence is string => !!sentence),
  );

  const domainMap = new Map<string, string[]>();
  for (const entity of entityList) {
    const domain = inferDomain(entity);
    const changes = domainMap.get(domain) ?? [];
    changes.push(
      buildEntityChange(
        entity,
        changedRelationships,
        graphs.get(entity.id) ?? null,
      ),
    );
    domainMap.set(domain, changes);
  }

  const domains = [...domainMap.entries()]
    .map(([name, changes]) => ({ name, changes: uniqueStrings(changes) }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const domainNames = domains.map((domain) => domain.name);

  const headline = `${summarizeTypes(entityList)} changed${
    domainNames.length > 1 ? ` across ${formatList(domainNames)} domains` : ""
  }.`;
  const allDomainChanges = domains.flatMap((domain) => domain.changes);
  const validationStatus = validationStatusText(checkResult);
  const tldr = [
    headline,
    summarizeTopChanges(allDomainChanges, relationshipChanges),
    validationStatus === "All checks pass"
      ? "Validation remains clean."
      : `${validationStatus}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline,
    tldr,
    domains,
    relationshipChanges,
    validationStatus,
  };
}
