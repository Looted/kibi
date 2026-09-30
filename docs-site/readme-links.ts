/**
 * Checks that the repository README points at published documentation pages.
 * A catalog source linked as `docs/foo.md` is the GitHub rendering; the
 * published URL is derived from the catalog instead of a second hand-kept list.
 */

import {
  LLMS_INDEX_PATH,
  PUBLISHED_DOCS_ORIGIN,
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
  if (href === PUBLISHED_DOCS_ORIGIN || href === `${PUBLISHED_DOCS_ORIGIN}/`) {
    return [];
  }
  if (!href.startsWith(`${PUBLISHED_DOCS_ORIGIN}/`)) return [];
  const rest = href.slice(PUBLISHED_DOCS_ORIGIN.length + 1);
  const [sitePath, fragment] = splitHash(rest);
  if (
    sitePath === "" ||
    sitePath === "index.html" ||
    sitePath === LLMS_INDEX_PATH
  ) {
    return [];
  }
  const page = pageForSitePath(sitePath);
  if (!page) {
    return [`${href} is not a page in the documentation catalog.`];
  }
  if (fragment !== "" && !sitePath.endsWith(".html")) {
    return [`${href} is not a published documentation page.`];
  }
  return [];
}

function splitHash(href: string): [string, string] {
  const at = href.indexOf("#");
  if (at === -1) return [href, ""];
  return [href.slice(0, at), href.slice(at)];
}
