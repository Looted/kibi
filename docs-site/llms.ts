/**
 * llms.txt is the language-model index of the published documentation.
 * It is rendered from the catalog at site-build time, so the index cannot
 * name a page the site does not publish.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DOCS,
  type DocPage,
  type DocSection,
  publishedPageHref,
} from "./catalog.js";

// implements REQ-docs-readme-published-links
export function renderLlmsTxt(repoRoot: string): string {
  const lines = [
    "# Kibi",
    "",
    "> Say what the software should do. Kibi makes the agent remember it—and prove the implementation.",
    "",
    "This index lists the published documentation. Follow these links into the deeper pages. Do not treat the GitHub rendering of the same markdown sources as the documentation.",
    "",
  ];
  let section: DocSection | "" = "";
  let group = "";
  for (const page of DOCS) {
    if (page.section !== section) {
      section = page.section;
      group = "";
      lines.push(`## ${page.section === "guide" ? "Guide" : "Reference"}`, "");
    }
    if (page.group !== group) {
      group = page.group;
      lines.push(`### ${group}`, "");
    }
    const meta = pageMeta(repoRoot, page);
    lines.push(
      `- [${meta.title}](${publishedPageHref(page)}): ${oneLine(meta.description)}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function pageMeta(
  repoRoot: string,
  page: DocPage,
): { title: string; description: string } {
  const raw = readFileSync(path.join(repoRoot, page.source), "utf8");
  const front = frontMatter(raw);
  return {
    title: page.title ?? front.title ?? page.slug,
    description: page.description ?? front.description ?? "",
  };
}

function frontMatter(raw: string): { title?: string; description?: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match?.[1]) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { title: fields.title, description: fields.description };
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
