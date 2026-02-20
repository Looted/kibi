/**
 * Pure helper functions for VS Code extension - no VS Code imports
 */

export function categorizeEntities(
  relationships: Array<{ type: string; from: string; to: string }>,
): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    reqs: [],
    scenarios: [],
    tests: [],
    adrs: [],
    flags: [],
    events: [],
    symbols: [],
    other: [],
  };

  const prefixMap: Record<string, keyof typeof categories> = {
    "REQ-": "reqs",
    "SCEN-": "scenarios",
    "TEST-": "tests",
    "ADR-": "adrs",
    "FLAG-": "flags",
    "EVENT-": "events",
    "SYM-": "symbols",
  };

  for (const rel of relationships) {
    for (const id of [rel.from, rel.to]) {
      let categorized = false;

      for (const [prefix, category] of Object.entries(prefixMap)) {
        if (id.startsWith(prefix)) {
          const list = categories[category];
          if (list && !list.includes(id)) {
            list.push(id);
          }
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        const list = categories.other;
        if (!list.includes(id)) {
          list.push(id);
        }
      }
    }
  }

  return categories;
}

export function formatLensTitle(
  categories: Record<string, string[]>,
  guardedBy: Array<{ flagId: string; flagName: string }>,
): string {
  const parts: string[] = [];

  const emojiMap: Record<string, string> = {
    reqs: "📋",
    scenarios: "🎭",
    tests: "✓",
    adrs: "📐",
    flags: "🚩",
    events: "⚡",
    symbols: "🔗",
  };

  const singularMap: Record<string, string> = {
    reqs: "req",
    scenarios: "scenario",
    tests: "test",
    adrs: "ADR",
    flags: "flag",
    events: "event",
    symbols: "symbol",
  };

  const pluralMap: Record<string, string> = {
    reqs: "reqs",
    scenarios: "scenarios",
    tests: "tests",
    adrs: "ADRs",
    flags: "flags",
    events: "events",
    symbols: "symbols",
  };

  for (const [category, ids] of Object.entries(categories)) {
    const count = ids.length;
    if (count > 0) {
      const emoji = emojiMap[category] || "";
      const singular = singularMap[category] || category.slice(0, -1);
      const plural = pluralMap[category] || category;
      const label = count === 1 ? singular : plural;
      parts.push(`${emoji} ${count} ${label}`);
    }
  }

  if (guardedBy.length > 0) {
    const flagNames = guardedBy.map((f) => f.flagName).join(", ");
    parts.push(`🚩 guarded by ${flagNames}`);
  }

  if (parts.length === 0) {
    return "No linked entities";
  }

  return parts.join(" • ");
}

export function buildHoverMarkdown(
  symbolInfo: { id: string; title: string; file: string; line: number },
  entities: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    tags: string[];
  }>,
): string {
  const lines: string[] = [];

  lines.push(`# ${symbolInfo.id}`);
  lines.push("");
  lines.push(`\`${symbolInfo.file}:${symbolInfo.line}\``);
  lines.push("");

  const emojiMap: Record<string, string> = {
    req: "📋",
    scenario: "🎭",
    test: "✓",
    adr: "📐",
    flag: "🚩",
    event: "⚡",
    symbol: "🔗",
  };

  for (const entity of entities) {
    const emoji = emojiMap[entity.type] || "📄";
    const tagsStr = entity.tags.length > 0 ? entity.tags.join(", ") : "none";
    lines.push(
      `${emoji} **${entity.id}**: ${entity.title} (status: ${entity.status}, tags: ${tagsStr})`,
    );
  }

  lines.push("");
  lines.push("[Browse entities](command:kibi.browseLinkedEntities)");

  return lines.join("
");
}
