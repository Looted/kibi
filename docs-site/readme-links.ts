/**
 * Checks that the repository README points at published documentation pages.
 * A catalog source linked as `docs/foo.md` is the GitHub rendering; the
 * published URL is derived from the catalog instead of a second hand-kept list.
 */

import {
  LEGACY_DOCS_PATH,
  LLMS_INDEX_PATH,
  PUBLISHED_SITE_ORIGIN,
  REPORT_PATH,
  pageForSitePath,
  pageForSource,
  publishedLlmsIndexHref,
  publishedPageHref,
} from "./catalog.js";

const MARKDOWN_LINK = /\[(?:[^\]]*)\]\(([^)\s]+)\)/g;

// implements REQ-docs-readme-published-links
export function readmePublishedDocProblems(markdown: string): string[] {
  const problems: string[] = [];
  if (!markdown.includes(publishedLlmsIndexHref())) {
    problems.push(
      `README must link language models to ${publishedLlmsIndexHref()}`,
    );
  }
  for (const match of markdown.matchAll(MARKDOWN_LINK)) {
    const href = match[1];
    if (!href) continue;
    problems.push(...problemsForHref(href));
  }
  return problems;
}

function problemsForHref(href: string): string[] {
  if (href.startsWith("docs/") && !href.startsWith("docs/examples/")) {
    const [source, fragment] = splitHash(href);
    const page = pageForSource(source);
    if (page) {
      return [
        `${href} is the GitHub copy of a published page. Use ${publishedPageHref(page, fragment)}.`,
      ];
    }
  }
  if (href === PUBLISHED_SITE_ORIGIN || href === `${PUBLISHED_SITE_ORIGIN}/`) {
    return [];
  }
  if (!href.startsWith(`${PUBLISHED_SITE_ORIGIN}/`)) return [];
  const [sitePath] = splitHash(href.slice(PUBLISHED_SITE_ORIGIN.length + 1));
  if (
    sitePath === "" ||
    sitePath === "index.html" ||
    sitePath === LLMS_INDEX_PATH ||
    `${sitePath}/` === REPORT_PATH ||
    sitePath.startsWith(REPORT_PATH)
  ) {
    return [];
  }
  if (sitePath.startsWith(LEGACY_DOCS_PATH)) {
    return [`${href} is a legacy redirect. Link the page at the site root.`];
  }
  if (!pageForSitePath(sitePath)) {
    return [`${href} is not a page in the documentation catalog.`];
  }
  return [];
}

function splitHash(href: string): [string, string] {
  const at = href.indexOf("#");
  if (at === -1) return [href, ""];
  return [href.slice(0, at), href.slice(at)];
}
