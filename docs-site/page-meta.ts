/**
 * Page title and description, resolved once for every consumer. Pages authored
 * in docs-site/content/ carry front matter; mirrored docs/*.md sources take
 * their title and description from the catalog entry.
 */

import type { DocPage } from "./catalog.js";

// implements REQ-docs-site-root-pages
export type FrontMatter = {
  title?: string;
  description?: string;
  body: string;
};

// implements REQ-docs-readme-published-links
// implements REQ-docs-site-root-pages
export function parseFrontMatter(raw: string): FrontMatter {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match?.[1]) return { body: raw };
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return {
    title: fields.title,
    description: fields.description,
    body: raw.slice(match[0].length),
  };
}

// implements REQ-docs-readme-published-links
// implements REQ-docs-site-root-pages
export function isAuthoredPage(page: DocPage): boolean {
  return page.source.startsWith("docs-site/content/");
}

// implements REQ-docs-readme-published-links
// implements REQ-docs-site-root-pages
export function pageMeta(
  page: DocPage,
  raw: string,
): { title: string; description: string; body: string } {
  const front = isAuthoredPage(page) ? parseFrontMatter(raw) : { body: raw };
  return {
    title: front.title ?? page.title ?? page.slug,
    description: front.description ?? page.description ?? "",
    body: front.body,
  };
}
