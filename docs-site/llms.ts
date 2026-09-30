/**
 * llms.txt is the language-model index of the published documentation.
 * It is rendered from the catalog at site-build time, so the index cannot
 * name a page the site does not publish. Each catalog group becomes one
 * H2 link list, the shape the llms.txt convention expects.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { DOCS, SITE_TAGLINE, publishedPageHref } from "./catalog.js";
import { pageMeta } from "./page-meta.js";

// implements REQ-docs-readme-published-links
export function renderLlmsTxt(repoRoot: string): string {
  const lines = [
    "# Kibi",
    "",
    `> ${SITE_TAGLINE}`,
    "",
    "Kibi keeps product intent, requirements, and their proof in the repository beside the code, so coding agents carry them across sessions and branches. Start with the guide; the reference is the exact CLI, MCP, and schema contract.",
  ];
  let heading = "";
  for (const page of DOCS) {
    const section = page.section === "guide" ? "Guide" : "Reference";
    const next = `## ${section}: ${page.group}`;
    if (next !== heading) {
      heading = next;
      lines.push("", heading, "");
    }
    const raw = readFileSync(path.join(repoRoot, page.source), "utf8");
    const meta = pageMeta(page, raw);
    lines.push(
      `- [${meta.title}](${publishedPageHref(page)}): ${oneLine(meta.description)}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
